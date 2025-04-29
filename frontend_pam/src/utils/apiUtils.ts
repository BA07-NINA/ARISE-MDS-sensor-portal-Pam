import { ApiResponse } from '@/types/api';

/**
 * Safely extracts data from an API response
 * @param response The API response
 * @returns The data from the response
 * @throws Error if the response is invalid
 */
export function extractApiData<T>(response: ApiResponse<T>): T {
  if (!response || !('data' in response)) {
    throw new Error('Invalid API response format');
  }
  return response.data;
}

/**
 * Transforms snake_case keys to camelCase
 */
export function camelCaseKeys<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(camelCaseKeys);
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()),
        camelCaseKeys(value)
      ])
    );
  }
  
  return obj;
} 