export default interface Course {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  isEnrolled?: boolean;
  isFavorite?: boolean;
  enrolledUsersCount?: number;
  dateCreated: string;
}
