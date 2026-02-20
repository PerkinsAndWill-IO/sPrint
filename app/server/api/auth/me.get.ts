interface ApsUserProfile {
  name: string
  emailId: string
  firstName: string
  lastName: string
  profileImages: Record<string, string>
}

export default eventHandler(async (event) => {
  const token = await getApsAccessToken(event)
  const profile = await apsFetch<ApsUserProfile>(token, '/userprofile/v1/users/@me')

  return {
    name: profile.name || `${profile.firstName} ${profile.lastName}`,
    email: profile.emailId,
    avatar: profile.profileImages?.sizeX40 || profile.profileImages?.sizeX50 || ''
  }
})
