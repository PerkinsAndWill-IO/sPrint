export default eventHandler(async (event) => {
  const token = await getApsAccessToken(event)
  return { access_token: token }
})
