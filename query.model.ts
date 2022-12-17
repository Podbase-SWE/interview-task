export interface queryModel {
  withSummary: boolean;
  withCategories: boolean;
  withFeaturedPosts: boolean;
  input: {
    pagination: {
      skipPages: number;
      pageSize: number;
      firstItemOnPage: any;
      lastItemOnPage: any;
    };
    sorting: sortingModel[];
    filter: {
      categories: string[];
      search: string;
    };
  };
}

interface sortingModel {
  name: string;
  asc: boolean;
}
