import type { NextFunction, Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { ZodSchema } from 'zod';

type RequestSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

const setRequestValue = <T>(request: Request, key: 'body' | 'params' | 'query', value: T): void => {
  Object.defineProperty(request, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

export const validateRequest =
  (schemas: RequestSchemas) => (request: Request, _response: Response, next: NextFunction): void => {
    if (schemas.body) {
      setRequestValue(request, 'body', schemas.body.parse(request.body));
    }

    if (schemas.params) {
      setRequestValue(request, 'params', schemas.params.parse(request.params) as ParamsDictionary);
    }

    if (schemas.query) {
      setRequestValue(request, 'query', schemas.query.parse(request.query) as ParsedQs);
    }

    next();
  };
