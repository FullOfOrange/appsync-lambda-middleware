export type AuthUser = {
  userId: number
  email: string
  firstName: string
  lastName: string
  phone: string
  profileImage: string
  countryCode: string
  timezone: string
  fullName: string
  userRoleId: number
}

export type AuthType = {
  user: AuthUser
  permission: string
  rooms: string[]
}

export class Auth {
  auth: AuthType = null

  setAuthToken(token: AuthType) {
    this.auth = token
  }

  get user() {
    if (this.auth) {
      return this.auth.user
    }
    return null
  }

  get rooms() {
    if (this.auth) {
      return this.auth.rooms
    }
    return null
  }

  get permission() {
    if (this.auth) {
      return this.auth.permission
    }
    return null
  }
}
