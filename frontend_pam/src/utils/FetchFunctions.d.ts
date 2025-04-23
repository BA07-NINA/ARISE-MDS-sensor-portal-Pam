declare module '@/utils/FetchFunctions' {
    /** Just returns the parsed JSON */
    export function getData<T = unknown>(
      url: string,
      token: string
    ): Promise<T>;
  
    export function postData<T = unknown>(
      url: string,
      token: string,
      data: unknown
    ): Promise<T>;
  
    export function patchData<T = unknown>(
      url: string,
      token: string,
      data: unknown
    ): Promise<T>;
  
    export function deleteData<T = unknown>(
      url: string,
      token: string
    ): Promise<T>;
  }
  
  