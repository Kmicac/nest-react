export default interface CourseQuery {
  name?: string;
  description?: string;
  favoritesOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'dateCreated' | 'name' | 'description';
  sortOrder?: 'ASC' | 'DESC';
}
