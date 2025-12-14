export const cloudinaryFolder = ({
  username,
  type, // avatar | video_profile | user_skill_videos | user_combos
}) => {
  return `calistenia_app/${username}/${type}`;
};
