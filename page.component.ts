import { Component, OnDestroy, OnInit } from "@angular/core";
import { QueryRef } from "apollo-angular";
import { untilDestroyed } from "ngx-take-until-destroy";
import { first } from "rxjs/operators";
import { Subscription } from "rxjs";
import {
  AllBlogPostsGQL,
  AllBlogPostsQuery,
  AllBlogPostsQueryVariables,
  BlogPost,
  Pagination,
} from "@pb-graphql";
import { SeoService } from "@pb-services";

import {
  SEARCH_RESULTS,
  RECENT_POSTS,
  CATEGORY_POSTS,
  CATEGORY_SUFFIX,
} from "./page-title.constants";
import { ALL_CATEGORIES } from "./category.constants";
import { queryModel } from "./query.model";

@Component({
  selector: "pb-page-blog",
  templateUrl: "./page-blog.component.html",
  styleUrls: ["./page-blog.component.scss"],
})
export class PageBlogComponent implements OnInit, OnDestroy {
  private _subscription = new Subscription();

  posts: BlogPost[];
  paginationData: Pagination;
  featuredPosts: BlogPost[];
  categories: string[];

  selectedCategory = ALL_CATEGORIES;

  pageTitle = "";
  pageIndex = 0;

  readonly pageSize = 3;

  private _searchQuery = "";
  private _allBlogPostsQuery: QueryRef<
    AllBlogPostsQuery,
    AllBlogPostsQueryVariables
  >;
  private _searchTimer: any;

  constructor(
    private readonly _seo: SeoService,
    private readonly _allBlogPostsGQL: AllBlogPostsGQL
  ) {}

  ngOnInit(): void {
    // Big boy makaroon
    this._allBlogPostsQuery = this._allBlogPostsGQL.watch(
      this._getQuery({
        initialLoad: true,
      })
    );

    this._subscription.add(this._subscribeToBlogPosts());
    this._subscription.add(this._subscribeToBlogPostsUntilDestroyed());

    this._setPageTitle();
    this._setMetaTags();
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  searchPosts(): void {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.filterPosts(), 1000);
  }

  filterPosts(): void {
    this._allBlogPostsQuery.refetch(this._getQuery()).then(() => {
      this.pageIndex = 0;
    });
  }

  prevPage(): void {
    this._setPageIndex(-1);
  }

  nextPage(): void {
    this._setPageIndex(1);
  }

  setQuery(query: string): void {
    this._searchQuery = query;
  }

  private _subscribeToBlogPosts(): Subscription {
    return this._allBlogPostsQuery.valueChanges
      .pipe(first(({ data }) => !!data.featuredBlogPosts))
      .subscribe(({ data }) => {
        this.featuredPosts = data.featuredBlogPosts;
        this.categories = [ALL_CATEGORIES, ...data.blogCategories];
      });
  }

  // naming could be improved
  private _subscribeToBlogPostsUntilDestroyed(): Subscription {
    return this._allBlogPostsQuery.valueChanges
      .pipe(untilDestroyed(this))
      .subscribe(({ data }) => {
        this.paginationData = data.response.pagination;
        this.posts = data.response.items;
        this._setPageTitle();
      });
  }

  private _setPageIndex(skipPages: number): void {
    this.pageIndex += skipPages;
    this._allBlogPostsQuery.refetch(
      this._getQuery({
        skipPages,
      })
    );
  }

  private _getQuery({
    initialLoad = false,
    skipPages,
  }: {
    initialLoad?: boolean;
    skipPages?: number;
  } = {}): queryModel {
    return {
      withSummary: true,
      withCategories: initialLoad,
      withFeaturedPosts: initialLoad,
      input: {
        pagination: {
          skipPages: skipPages ? skipPages : 0,
          pageSize: this.pageSize,
          firstItemOnPage:
            this.paginationData && this.paginationData.firstItemOnPage,
          lastItemOnPage:
            this.paginationData && this.paginationData.lastItemOnPage,
        },
        sorting: [
          {
            name: "date",
            asc: false,
          },
        ],
        filter: {
          categories:
            this.selectedCategory && this.selectedCategory !== ALL_CATEGORIES
              ? [this.selectedCategory]
              : this.categories,
          search: this._searchQuery,
        },
      },
    };
  }

  private _setPageTitle(): void {
    if (this._searchQuery) {
      this.pageTitle =
        SEARCH_RESULTS + this.selectedCategory !== ALL_CATEGORIES
          ? `${CATEGORY_SUFFIX} ${this.selectedCategory}`
          : "";
    } else if (this.selectedCategory === ALL_CATEGORIES) {
      this.pageTitle = RECENT_POSTS;
    } else {
      this.pageTitle = `${CATEGORY_POSTS} '${this.selectedCategory}'`;
    }
    // https://pbs.twimg.com/media/DAw0TC1XkAE1Tr4.jpg
  }

  private _setMetaTags(): void {
    this._seo.setPageMeta({
      title: "Blog",
      description: "The Podbase blog - news, advice and other articles",
    });
  }
}
