import {
  AppSyncResolverEvent,
  AppSyncResolverHandler,
  Callback,
} from 'aws-lambda'
import { Auth } from './Auth'
import { LambdaError } from './error'

export type MiddlewareFunction<T = any, R = any> = (
  ctx: MiddlewareContext<T, R>,
) => any | Promise<any>

export type MiddlewareContext<T, R> = {
  event: AppSyncResolverEvent<T>
  root: R | null
  args: T
  headers: Record<any, any>
  res: Response
  auth: Auth
}

export const slsFunction =
  (app: Middleware): AppSyncResolverHandler<any, any> =>
  async (event, ctx, callback) => {
    await app.run(event, callback)
  }

class Response {
  result = null

  send(result: any) {
    this.result = result
  }

  err(error: any) {
    this.result = {
      errorType: error.errorType,
      errorMessage: error.errorMessage,
      data: null,
    }
  }

  getResult() {
    return this.result
  }
}

export class DefaultRouter {
  private mwArr: {
    type: string
    route: string
    fn: MiddlewareFunction
  }[] = []

  use<T = any, R = any>(
    type: string,
    route: string,
    ...args: Array<MiddlewareFunction>
  ) {
    for (let i = 0; i < args.length; i++) {
      this.mwArr.push({ type, route, fn: args[i] })
    }
  }

  query<T = any, R = any>(
    route: string,
    ...args: Array<MiddlewareFunction<T, R>>
  ) {
    this.use('Query', route, ...args)
  }

  mutation<T = any, R = any>(
    route: string,
    ...args: Array<MiddlewareFunction<T, R>>
  ) {
    this.use('Mutation', route, ...args)
  }

  subscription<T = any, R = any>(
    route: string,
    ...args: Array<MiddlewareFunction<T, R>>
  ) {
    this.use('Subscription', route, ...args)
  }

  get() {
    return this.mwArr
  }
}

export class Middleware {
  private mwArr: {
    type: string
    route: string
    fn: MiddlewareFunction
  }[] = []

  use(
    type: string | DefaultRouter | MiddlewareFunction,
    route?: string | MiddlewareFunction,
    ...args: Array<MiddlewareFunction>
  ) {
    if (type instanceof DefaultRouter) {
      const routerArr = type.get()

      for (let i = 0; i < routerArr.length; i++) {
        this.mwArr.push(routerArr[i])
      }
    } else if (typeof type === 'string' && typeof route === 'string') {
      for (let i = 0; i < args.length; i++) {
        this.mwArr.push({ type, route, fn: args[i] })
      }
    } else {
      if (typeof type !== 'function' || typeof route !== 'function') return

      this.mwArr.push({ type: '*', route: '*', fn: type })
      this.mwArr.push({ type: '*', route: '*', fn: route })
      for (let i = 0; i < args.length; i++) {
        this.mwArr.push({ type: '*', route: '*', fn: args[i] })
      }
    }
  }

  async run(
    event: AppSyncResolverEvent<any>[] | AppSyncResolverEvent<any>,
    callback: Callback,
  ) {
    if (Array.isArray(event)) {
      const source = event.map((e) => e.source)
      event[0].source = source
      event = event[0]
    }

    const callRoute = event.info.fieldName
    const callType = event.info.parentTypeName

    const ctx: MiddlewareContext<any, any> = {
      event,
      root: event.source,
      args: event.arguments,
      headers: event.request.headers,
      res: new Response(),
      auth: new Auth(),
    }

    for (let i = 0; i < this.mwArr.length; i++) {
      const { type, route, fn } = this.mwArr[i]
      if (type !== '*' && type !== callType) continue
      if (route !== '*' && route !== callRoute) continue

      try {
        const r = await fn(ctx)
        if (r) {
          ctx.res.send(r)
        }
      } catch (err: any) {
        if (err instanceof LambdaError) {
          ctx.res.err({
            errorType: err.errorType,
            errorMessage: err.errorMessage,
          })
        } else {
          ctx.res.err({
            errorType: 'InternalServerError',
            errorMessage: err.message,
          })
        }
        break
      }
    }
    callback(null, ctx.res.getResult())
  }
}
