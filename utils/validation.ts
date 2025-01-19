// export const validateTopicData = (data: any) => {
//   const errors: string[] = [];

//   if (!data.topicTitle?.trim()) {
//     errors.push('Topic title is required');
//   }

//   if (data.topicTitle?.length > 200) {
//     errors.push('Topic title must be less than 200 characters');
//   }

//   if (data.isPrivate && (!Array.isArray(data.allowedUsers) || data.allowedUsers.length === 0)) {
//     errors.push('Private topics must have at least one allowed user');
//   }

//   return errors;
// }; 