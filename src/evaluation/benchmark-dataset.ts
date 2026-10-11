import type { GeneratedHintCandidate } from '../background/graph/types';
import type { HintLevel } from '../shared/schemas/hints';

export interface BenchmarkCandidate {
  level: HintLevel;
  candidate: GeneratedHintCandidate;
  expectedLeak: boolean;
  expectedGrounded: boolean;
  expectedCriticPass: boolean;
  notes: string;
}

export interface BenchmarkProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  url: string;
  statementText: string;
  candidates: BenchmarkCandidate[];
}

export const BENCHMARK_PROBLEMS: BenchmarkProblem[] = [
  // 1. Two Sum (Arrays & Hashing)
  {
    id: 'BM-01',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    url: 'https://leetcode.com/problems/two-sum',
    statementText:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order. Constraints: 2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Notice that for each number x, you are looking for target minus x. What data structure allows instant lookup of previously seen values?',
          topics: ['Hash Table'],
          groundedQuote: 'return indices of the two numbers such that they add up to target',
          selfConfidence: 0.95,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 pure direction without implementation details',
      },
      {
        level: 2,
        candidate: {
          hint: 'Maintain a map from value to its index while iterating across the list. At each step, query whether complement is already in the map.',
          topics: ['Hash Table', 'Array'],
          groundedQuote: 'return indices of the two numbers such that they add up to target',
          selfConfidence: 0.9,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L2 strategic approach without code blocks',
      },
      {
        level: 3,
        candidate: {
          hint: 'Initialize seen = {}\nFor i, num in enumerate(nums):\n  diff = target - num\n  if diff in seen: return [seen[diff], i]\n  seen[num] = i',
          codeBlock: 'seen = {}\nfor i, num in enumerate(nums):\n    diff = target - num\n    if diff in seen:\n        return [seen[diff], i]\n    seen[num] = i',
          topics: ['Hash Table'],
          groundedQuote: 'return indices of the two numbers such that they add up to target',
          selfConfidence: 0.98,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L3 pseudocode scaffold permitted code blocks',
      },
    ],
  },

  // 2. Valid Parentheses (Stack)
  {
    id: 'BM-02',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    tags: ['String', 'Stack'],
    url: 'https://leetcode.com/problems/valid-parentheses',
    statementText:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets must be closed by the same type of brackets and open brackets must be closed in the correct order. Every close bracket has a corresponding open bracket of the same type.",
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Think about which bracket needs to be closed first when you encounter multiple nested openings. What last-in-first-out container mirrors this matching order?',
          topics: ['Stack'],
          groundedQuote: 'open brackets must be closed in the correct order',
          selfConfidence: 0.92,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 conceptual stack prompt',
      },
      {
        level: 2,
        candidate: {
          hint: 'Push opening brackets onto a stack. When a closing bracket arrives, verify if the top of the stack matches its corresponding pair, then pop it.',
          topics: ['Stack'],
          groundedQuote: 'open brackets must be closed by the same type of brackets',
          selfConfidence: 0.94,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L2 stack processing strategy',
      },
    ],
  },

  // 3. Merge Two Sorted Lists (Linked List)
  {
    id: 'BM-03',
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    tags: ['Linked List', 'Recursion'],
    url: 'https://leetcode.com/problems/merge-two-sorted-lists',
    statementText:
      'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Consider creating a dummy sentinel node to simplify edge cases at the head. Then compare the current values of both heads.',
          topics: ['Linked List'],
          groundedQuote: 'Merge the two lists into one sorted list',
          selfConfidence: 0.9,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 sentinel hint',
      },
    ],
  },

  // 4. Best Time to Buy and Sell Stock (Sliding Window / Greedy)
  {
    id: 'BM-04',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    tags: ['Array', 'Dynamic Programming'],
    url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock',
    statementText:
      'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'As you iterate through the prices sequentially, track the minimum price encountered so far. What is the best profit you could make selling on the current day?',
          topics: ['Array'],
          groundedQuote: 'maximize your profit by choosing a single day to buy one stock',
          selfConfidence: 0.96,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 single pass invariant',
      },
    ],
  },

  // 5. Invert Binary Tree (Trees)
  {
    id: 'BM-05',
    title: 'Invert Binary Tree',
    difficulty: 'Easy',
    tags: ['Tree', 'Depth-First Search', 'Binary Tree'],
    url: 'https://leetcode.com/problems/invert-binary-tree',
    statementText:
      'Given the root of a binary tree, invert the tree, and return its root. Inverting means swapping left and right children for every node recursively.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Break the problem down to a single node: if you swap its left and right pointers, what do you need to do for its descendants?',
          topics: ['Binary Tree', 'Recursion'],
          groundedQuote: 'Given the root of a binary tree, invert the tree',
          selfConfidence: 0.95,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 recursive intuition',
      },
    ],
  },

  // 6. Maximum Subarray (Kadane / DP)
  {
    id: 'BM-06',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    tags: ['Array', 'Divide and Conquer', 'Dynamic Programming'],
    url: 'https://leetcode.com/problems/maximum-subarray',
    statementText:
      'Given an integer array nums, find the subarray with the largest sum, and return its sum. A subarray is a contiguous non-empty sequence of elements within an array.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'When moving from left to right, if your accumulated current running sum drops below zero, does keeping it help you form a larger sum with upcoming numbers?',
          topics: ['Dynamic Programming'],
          groundedQuote: 'find the subarray with the largest sum',
          selfConfidence: 0.94,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 Kadane invariant direction',
      },
      {
        level: 2,
        candidate: {
          hint: 'Maintain currentSum and maxSum. For each num, currentSum becomes max(num, currentSum + num), and maxSum tracks the best seen.',
          topics: ['Dynamic Programming'],
          groundedQuote: 'find the subarray with the largest sum',
          selfConfidence: 0.92,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L2 state recurrence formulation',
      },
    ],
  },

  // 7. Binary Search (Search)
  {
    id: 'BM-07',
    title: 'Binary Search',
    difficulty: 'Easy',
    tags: ['Array', 'Binary Search'],
    url: 'https://leetcode.com/problems/binary-search',
    statementText:
      'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Since the array is sorted, comparing the middle element with target immediately tells you which half can be discarded.',
          topics: ['Binary Search'],
          groundedQuote: 'nums which is sorted in ascending order',
          selfConfidence: 0.97,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 partition direction',
      },
    ],
  },

  // 8. Reverse Linked List (Pointers)
  {
    id: 'BM-08',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    tags: ['Linked List', 'Recursion'],
    url: 'https://leetcode.com/problems/reverse-linked-list',
    statementText:
      'Given the head of a singly linked list, reverse the list, and return the reversed list. A linked list can be reversed either iteratively or recursively.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Keep track of three pointers: previous, current, and next. Before altering current pointer to point backward, save the next node so you do not lose the rest of the chain.',
          topics: ['Linked List'],
          groundedQuote: 'reverse the list, and return the reversed list',
          selfConfidence: 0.95,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 pointer tracking direction',
      },
    ],
  },

  // 9. Climbing Stairs (Fibonacci / DP)
  {
    id: 'BM-09',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    tags: ['Math', 'Dynamic Programming', 'Memoization'],
    url: 'https://leetcode.com/problems/climbing-stairs',
    statementText:
      'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'To reach step n, you could have arrived from either step n-1 (by taking 1 step) or step n-2 (by taking 2 steps). How does this relate to known sequences?',
          topics: ['Dynamic Programming'],
          groundedQuote: 'Each time you can either climb 1 or 2 steps',
          selfConfidence: 0.96,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 transition recurrence',
      },
    ],
  },

  // 10. Coin Change (DP / Knapsack)
  {
    id: 'BM-10',
    title: 'Coin Change',
    difficulty: 'Medium',
    tags: ['Array', 'Dynamic Programming', 'Breadth-First Search'],
    url: 'https://leetcode.com/problems/coin-change',
    statementText:
      'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1. You may assume that you have an infinite number of each kind of coin.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Consider building up from amount 0 to amount n. For any sub-amount a, what is the minimum coins needed if you pick one coin c and add it to the best solution for a - c?',
          topics: ['Dynamic Programming'],
          groundedQuote: 'Return the fewest number of coins that you need to make up that amount',
          selfConfidence: 0.91,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 bottom-up intuition',
      },
    ],
  },

  // 11. Search in Rotated Sorted Array (Binary Search)
  {
    id: 'BM-11',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    tags: ['Array', 'Binary Search'],
    url: 'https://leetcode.com/problems/search-in-rotated-sorted-array',
    statementText:
      'There is an integer array nums sorted in ascending order (with distinct values). Prior to being passed to your function, nums is possibly rotated at an unknown pivot index. Given the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums. You must write an algorithm with O(log n) runtime complexity.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Even after rotation, when you divide the array in half at midpoint, one of the two halves is guaranteed to be strictly sorted. Determine which half is sorted first.',
          topics: ['Binary Search'],
          groundedQuote: 'Prior to being passed to your function, nums is possibly rotated at an unknown pivot index',
          selfConfidence: 0.92,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 rotated binary search invariant',
      },
    ],
  },

  // 12. Number of Islands (Graphs / Grid)
  {
    id: 'BM-12',
    title: 'Number of Islands',
    difficulty: 'Medium',
    tags: ['Array', 'Depth-First Search', 'Breadth-First Search', 'Union Find', 'Matrix'],
    url: 'https://leetcode.com/problems/number-of-islands',
    statementText:
      "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'When you encounter an unvisited land cell, you have found a new island. How can you traverse and sink/mark all connected land cells before continuing the outer scan?',
          topics: ['Depth-First Search', 'Graph'],
          groundedQuote: 'formed by connecting adjacent lands horizontally or vertically',
          selfConfidence: 0.93,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 flood fill / traversal guidance',
      },
    ],
  },

  // 13. Longest Substring Without Repeating Characters (Sliding Window)
  {
    id: 'BM-13',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    tags: ['Hash Table', 'String', 'Sliding Window'],
    url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters',
    statementText:
      'Given a string s, find the length of the longest substring without duplicate characters. Constraints: 0 <= s.length <= 5 * 10^4, s consists of English letters, digits, symbols and spaces.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Use two pointers to maintain a variable-length window. When the right pointer encounters a character already present in the window, where should the left pointer advance?',
          topics: ['Sliding Window'],
          groundedQuote: 'longest substring without duplicate characters',
          selfConfidence: 0.94,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 sliding window invariant',
      },
    ],
  },

  // 14. Course Schedule (Topological Sort / Graph)
  {
    id: 'BM-14',
    title: 'Course Schedule',
    difficulty: 'Medium',
    tags: ['Depth-First Search', 'Breadth-First Search', 'Graph', 'Topological Sort'],
    url: 'https://leetcode.com/problems/course-schedule',
    statementText:
      'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [a_i, b_i] indicates that you must take course b_i first if you want to take course a_i. Return true if you can finish all courses. Otherwise, return false.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'Model the course dependencies as directed edges in a graph. What graph condition makes it impossible to order tasks sequentially?',
          topics: ['Graph', 'Topological Sort'],
          groundedQuote: 'must take course b_i first if you want to take course a_i',
          selfConfidence: 0.93,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 cycle detection framing',
      },
    ],
  },

  // 15. LRU Cache (Design / Linked List + Hash Map)
  {
    id: 'BM-15',
    title: 'LRU Cache',
    difficulty: 'Medium',
    tags: ['Hash Table', 'Linked List', 'Design', 'Doubly-Linked List'],
    url: 'https://leetcode.com/problems/lru-cache',
    statementText:
      'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class: LRUCache(int capacity) Initialize the LRU cache with positive size capacity. int get(int key) Return the value of the key if the key exists, otherwise return -1. void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. Both operations must run in O(1) average time complexity.',
    candidates: [
      {
        level: 1,
        candidate: {
          hint: 'To achieve O(1) time for both lookup and node repositioning on access/eviction, pair a hash map for fast key lookup with a doubly-linked list for fast removal and insertion.',
          topics: ['Design', 'Doubly-Linked List', 'Hash Table'],
          groundedQuote: 'Both operations must run in O(1) average time complexity',
          selfConfidence: 0.91,
        },
        expectedLeak: false,
        expectedGrounded: true,
        expectedCriticPass: true,
        notes: 'L1 composite data structure design',
      },
    ],
  },
];
