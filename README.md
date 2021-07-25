Node.js lambda middleware for AWS Appsync

# Getting Started

```typescript
import { slsFunction, Middleware } from "appsync-lambda-middleware";

const api = new Middleware();
// add middlewares

const func = slsFunction(api);

export const graphql: AppSyncResolverHandler<any, any> = async (
  event,
  ctx,
  callback
) => {
  ...
  return await func(event, ctx, callback);
};
```
