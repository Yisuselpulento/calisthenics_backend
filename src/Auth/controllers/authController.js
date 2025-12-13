import User from "../../models/user.model.js"
import bcrypt from "bcryptjs"
/* import { sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationEmail, sendWelcomeEmail } from "../../resend/emails.js" */
import crypto from "crypto"
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { UpdateFullUser } from "../../utils/updateFullUser.js";

const LOCK_TIME = 15 * 60 * 1000; 
const MAX_ATTEMPTS = 5;

const isValidEmail = (email) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);

export const signup = async (req, res) => {
    const { email, password, fullName, username, gender, profileType } = req.body;

    try {
        if (!email || !password || !fullName || !username || !gender || !profileType ) {
            return res.status(400).json({
                success: false,
                message: "Todos los campos son requeridos.",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Formato de email inválido.",
            });
        }

        if (!['male', 'female'].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: "El género debe ser 'male' o 'female'.",
            });
        }

        if (!["static", "dynamic"].includes(profileType)) {
            return res.status(400).json({
                success: false,
                message: "profileType debe ser 'static' o 'dynamic'.",
            });
        }

        if (fullName.length < 3 || fullName.length > 20) {
            return res.status(400).json({
                success: false,
                message: "El nombre debe tener entre 3 y 20 caracteres.",
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: "El username solo puede contener letras, números y guiones bajos (sin espacios).",
            });
        }

        if (username.length < 3 || username.length > 15) {
            return res.status(400).json({
                success: false,
                message: "El username debe tener entre 3 y 15 caracteres.",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "La contraseña debe tener al menos 6 caracteres.",
            });
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(409).json({
                success: false,
                message: "El email ya está registrado.",
            });
        }

        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(409).json({
                success: false,
                message: "El username ya está tomado.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

        const user = new User({
            email,
            password: hashedPassword,
            fullName,
            username,
            gender,
            profileType, 

            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        await user.save();

        //await sendVerificationEmail(user.email, user.fullName, verificationToken);

        generateTokenAndSetCookie(res, user);

        const fullUser = await UpdateFullUser(user._id);

            return res.status(201).json({
                success: true,
                message: "Usuario creado exitosamente.",
                user: fullUser
            });

    } catch (error) {
        console.error("Error en signup:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


export const login = async (req,res) => {
     console.log("🔥 LOGIN HIT", new Date().toISOString());
    const { email, password  } = req.body;
	try {

		if (!email || !password) {
			return res.status(400).json({ success: false, message: "Por favor, ingrese correo y contraseña" });
		  }

	    if (!isValidEmail(email)) {
			return res.status(400).json({ success: false, message: "Formato de email inválido." });
		 }

		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "Usuario o password incorrecto" });
		}

		if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(400).json({
                success: false,
               message: `Intenta nuevamente después de ${new Date(user.lockUntil).toLocaleString('es-CL')}`,
            });
        }

		const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            user.loginAttempts += 1;

            if (user.loginAttempts >= MAX_ATTEMPTS) {
                user.lockUntil = Date.now() + LOCK_TIME;
                user.loginAttempts = 0; 
				await user.save();

				return res.status(400).json({
					success: false,
					message: `Demasiados intentos fallidos. Intenta nuevamente después de ${new Date(user.lockUntil).toLocaleString('es-CL')}`
				});
            }
            await user.save();

			const attemptsLeft = MAX_ATTEMPTS - user.loginAttempts;

            return res.status(400).json({ 
				success: false,
				message: `Usuario o password incorrecto. Intentos restantes: ${attemptsLeft}` });
        }

    
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

		generateTokenAndSetCookie(res, user)

		 const fullUser = await UpdateFullUser(user._id);

                    res.status(200).json({
                    success: true,
                    message: "Inicio de sesión exitoso",
                    user: fullUser
                    });
	} catch (error) {
		console.log("Error al iniciar session ", error);
		res.status(500).json({ success: false, message: error.message });
	}
}

export const verifyEmail = async (req,res)=>{

    const { code } = req.body;

	try {
		if (!code || typeof code !== "string") {
            return res.status(400).json({ success: false, message: "Código de verificación inválido." });
        }

		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(401).json({ success: false, message: "Token invalido a expirado." });
		}

		if (user.isVerified) {
            return res.status(400).json({ success: false, message: "El email ya ha sido verificado." });
        }

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();

		/*  await sendWelcomeEmail(user.email, user.username); */

		const fullUser = await UpdateFullUser(user._id);

                res.status(200).json({
                success: true,
                message: "Email verificado exitosamente",
                user: fullUser
                });

	} catch (error) {
		console.log("error en verificar Email ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
}

export const logout = async (req, res) => {
	try {
		if (!req.cookies?.token) {
            return res.status(401).json({ success: false, message: "No hay sesión activa." });
        }

		res.clearCookie("token", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			path: '/',
            
		});
		res.status(200).json({ success: true, message: "Sesión cerrada exitosamente." });
	} catch (error) {
		console.error("Error in logout: ", error);
		res.status(500).json({ success: false, message: "Error al cerrar la sesión." });
	}
};

export const forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		if (!isValidEmail(email)) {
			return res.status(400).json({ success: false, message: "Formato de email inválido." });
		 }

		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({ success: false, message: "Usuario no encontrado" });
		}

		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; 

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

	/* 	await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/update-password/${resetToken}`); */ 

		res.status(200).json({ success: true, message: "Te hemos enviado un link parapara restablecer tu contraseña" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		if (!token || typeof token !== "string") {
			return res.status(400).json({ success: false, message: "Token inválido." });
		}

		if (!password || password.length < 6) {
			return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" });
		}

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(401).json({ success: false, message: "El token de recuperación es inválido o ha expirado." });
		}
		
		const isSamePassword = await bcrypt.compare(password, user.password);
		if (isSamePassword) {
			return res.status(400).json({ success: false, message: "La nueva contraseña no puede ser igual a la anterior." });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		/* await sendResetSuccessEmail(user.email);  */

		const fullUser = await UpdateFullUser(user._id);

            res.status(200).json({
            success: true,
            message: "Password reset exitosamente",
            user: fullUser
            });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const checkAuth = async (req, res) => {
  try {
    if (!req.userId) {
      return res
        .status(401)
        .json({ success: false, message: "No autenticado" });
    }

    const user = await User.findById(req.userId)
      .select(
        "_id username fullName email videoProfile avatar gender notifications isAdmin isVerified profileType country altura peso notificationsCount ranking followers following favoriteCombos"
      )
       .populate({
        path: "favoriteCombos.static",
        select: "name type fingers energyPerSecond energyPerRep",
      })
      .populate({
        path: "favoriteCombos.dynamic",
        select: "name type fingers energyPerSecond energyPerRep",
      })
      .populate({
        path: "notifications",
        select: "type message read createdAt fromUser relatedSkill relatedCombo relatedTeam",
        options: { sort: { createdAt: -1 }, limit: 5 },
        populate: { path: "fromUser", select: "username fullName avatar" },
      })
      .populate({
        path: "followers",
        select: "username fullName avatar",
        options: { limit: 10 }, // puedes limitar si quieres
      })
      .populate({
        path: "following",
        select: "username fullName avatar",
        options: { limit: 10 }, // puedes limitar si quieres
      });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in checkAuth ", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resendVerificationToken = async (req, res) => {
    const userId = req.userId; 

    if (!userId) {
        return res.status(401).json({ success: false, message: "Usuario no autenticado." });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado." });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: "Este correo ya está verificado." });
        }

		 const COOLDOWN_MINUTES = 5;
			const now = Date.now();
			
			if (
			user.lastVerificationTokenSentAt &&
			now - user.lastVerificationTokenSentAt.getTime() <
				COOLDOWN_MINUTES * 60 * 1000
			) {
			return res.status(429).json({
				success: false,
				message: `Debes esperar ${COOLDOWN_MINUTES} minutos antes de solicitar un nuevo token.`,
			});
			}

        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationToken = verificationToken;
        user.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; 
		user.lastVerificationTokenSentAt = now;
		
        await user.save();

       
      /*   await sendVerificationEmail(user.email, user.username, verificationToken); */
 
        res.status(200).json({
            success: true,
            message: "Nuevo token de verificación enviado a tu correo electrónico.",
        });
    } catch (error) {
        console.error("Error en resendVerificationToken:", error);
        res.status(500).json({ success: false, message: "Error del servidor." });
    }
};

export const profileAdmin = (req, res) => {
    try {
      
        res.status(200).json({
            success: true,
            message: "Bienvenido, administrador",
            adminData: {
                userId: req.userId,
                isAdmin: req.isAdmin,
                timestamp: new Date(),
            },
        });
    } catch (error) {
        console.error("Error in profileAdmin:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};