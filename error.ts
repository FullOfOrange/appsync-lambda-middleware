export class LambdaError extends Error {
  errorType: string
  errorMessage: string

  constructor(errorType: string, errorMessage: string) {
    super(errorMessage)
    this.errorType = errorType
    this.errorMessage = errorMessage
  }
}
