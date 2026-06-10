import type { NextFunction, Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { ZodSchema } from 'zod';

type RequestSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export const validateRequest =
  (schemas: RequestSchemas) => (request: Request, _response: Response, next: NextFunction): void => {
    if (schemas.body) {
      request.body = schemas.body.parse(request.body);
    }

    if (schemas.params) {
      request.params = schemas.params.parse(request.params) as ParamsDictionary;
    }

    if (schemas.query) {
      request.query = schemas.query.parse(request.query) as ParsedQs;
    }

    next();
  };
