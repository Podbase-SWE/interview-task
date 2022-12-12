import { Component, OnDestroy, OnInit } from '@angular/core';
import { QueryRef } from 'apollo-angular';
import { untilDestroyed } from 'ngx-take-until-destroy';
import { first } from 'rxjs/operators';

import {
  AllBlogPostsGQL,
  AllBlogPostsQuery,
  AllBlogPostsQueryVariables,
  BlogPost,
  Pagination,
} from '@pb-graphql';
import { SeoService } from '@pb-services';

@Component({
  selector: 'pb-page-blog',
  templateUrl: './page-blog.component.html',
  styleUrls: ['./page-blog.component.scss'],
})
export class PageBlogComponent implements OnInit, OnDestroy {
  posts: BlogPost[];
  paginationData: Pagination;
  featuredPosts: BlogPost[];
  categories: string[];

  selectedCategory = 'All Categories';
  searchQuery = ''; // Private, public - no idea.

  pageTitle: string;
  pageIndex = 0;

  readonly pageSize = 3;

  private allBlogPostsQuery: QueryRef<AllBlogPostsQuery, AllBlogPostsQueryVariables>;
  private searchTimer: any;

  constructor(private seo: SeoService, private allBlogPostsGQL: AllBlogPostsGQL) {}

  ngOnInit() {
    // Big boy makaroon
    this.allBlogPostsQuery = this.allBlogPostsGQL.watch(
      this.getQuery({
        initialLoad: true,
      }),
    );

    this.allBlogPostsQuery.valueChanges
      .pipe(first(({ data }) => !!data.featuredBlogPosts))
      .subscribe(({ data }) => {
        this.featuredPosts = data.featuredBlogPosts;
        this.categories = ['All Categories', ...data.blogCategories];
      });

    this.allBlogPostsQuery.valueChanges.pipe(untilDestroyed(this)).subscribe(({ data }) => {
      this.paginationData = data.response.pagination;
      this.posts = data.response.items;
      this.setPageTitle();
    });

    this.setPageTitle();
    this.setMetaTags();
  }

  public ngOnDestroy() {}

  searchPosts() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.filterPosts(), 1000);
  }

  filterPosts() {
    this.allBlogPostsQuery.refetch(this.getQuery()).then(() => {
      this.pageIndex = 0;
    });
  }

  prevPage() {
    this.setPageIndex(-1);
  }

  nextPage() {
    this.setPageIndex(1);
  }

  private setPageIndex(skipPages: number) {
    this.pageIndex += skipPages;
    this.allBlogPostsQuery.refetch(
      this.getQuery({
        skipPages,
      }),
    );
  }

  private getQuery({
    initialLoad = false,
    skipPages,
  }: {
    initialLoad?: boolean;
    skipPages?: number;
  } = {}) {
    // No return type? 
    return {
      withSummary: true,
      withCategories: initialLoad,
      withFeaturedPosts: initialLoad,
      input: {
        pagination: {
          skipPages,
          pageSize: this.pageSize,
          firstItemOnPage: this.paginationData && this.paginationData.firstItemOnPage,
          lastItemOnPage: this.paginationData && this.paginationData.lastItemOnPage,
        },
        sorting: [
          {
            name: 'date',
            asc: false,
          },
        ],
        filter: {
          categories:
            this.selectedCategory === 'All Categories'
              ? this.categories
              : this.selectedCategory && [this.selectedCategory],
          search: this.searchQuery,
        },
      },
    };
  }

  private setPageTitle() {
    if (this.searchQuery) {
      if (this.selectedCategory === 'All Categories') {
        this.pageTitle = 'Search Results';
      } else {
        this.pageTitle = `Search Results in Category '${this.selectedCategory}'`;
      }
    } else if (this.selectedCategory === 'All Categories') {
      this.pageTitle = 'Recent Posts';
    } else {
      this.pageTitle = `Posts in Category '${this.selectedCategory}'`;
    }
    // https://pbs.twimg.com/media/DAw0TC1XkAE1Tr4.jpg
  }

  private setMetaTags() {
    this.seo.setPageMeta({
      title: 'Blog',
      description: 'The Podbase blog - news, advice and other articles',
    });
  }
}
