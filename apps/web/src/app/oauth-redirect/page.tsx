import trpcServer from "../../lib/trpc/trpc-server";
export default async function OAuthRedirect() {
  const res = await trpcServer.setToken("test").trpc.auth.oauth.query({
    access_token: "test3",
    refresh_token: "test",
    expires_in: 1,
    token_type: "test",
  });
  return <div>{JSON.stringify(res, null, 2)}xd</div>;
}
