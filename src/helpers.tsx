// SPDX-FileCopyrightText: © 2019 EteSync Authors
// SPDX-License-Identifier: GPL-3.0-only

import * as React from "react";
import * as Etebase from "etebase";

export const defaultColor = "#8BC34A";

export interface NoteMetadata extends Etebase.ItemMetadata {
  name: string;
  mtime: number;
}

export function* arrayToChunkIterator<T>(arr: T[], size: number) {
  for (let i = 0 ; i < arr.length ; i += size) {
    yield arr.slice(i, i + size);
  }
}

export function isPromise(x: any): x is Promise<any> {
  return x && typeof x.then === "function";
}

export function isDefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

export function startTask<T = any>(func: () => Promise<T> | T, delay = 0): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => {
        try {
          const ret = func();
          if (isPromise(ret)) {
            ret.then(resolve)
              .catch(reject);
          } else {
            resolve(ret);
          }
        } catch (e) {
          reject(e);
        }
      },
      delay);
  });
}

function isFunction(f: any): f is Function {
  return f instanceof Function;
}

export function useIsMounted() {
  const isMounted = React.useRef(false);
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
}

type PromiseParam = Promise<any> | (() => Promise<any>) | undefined;

export function usePromiseMemo<T>(promise: Promise<T> | undefined | null, deps: React.DependencyList, initial: T | undefined = undefined): T | undefined {
  const [val, setVal] = React.useState<T>((promise as any)._returnedValue ?? initial);
  React.useEffect(() => {
    let cancel = false;
    if (promise === undefined || promise === null) {
      return undefined;
    }
    promise.then((val) => {
      (promise as any)._returnedValue = val;
      if (!cancel) {
        setVal(val);
      }
    });
    return () => {
      cancel = true;
    };
  }, [...deps, promise]);
  return val;
}

export function useLoading(): [boolean, Error | undefined, (promise: PromiseParam) => void] {
  const isMounted = useIsMounted();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  function setPromise(inPromise: PromiseParam) {
    setLoading(true);
    setError(undefined);

    startTask(() => {
      const promise = (isFunction(inPromise) ? inPromise() : inPromise);

      if (isPromise(promise)) {
        promise.catch((e) => {
          if (isMounted.current) {
            setError(e);
          }
        }).finally(() => {
          if (isMounted.current) {
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });
  }

  return [loading, error, setPromise];
}