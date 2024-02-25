type AccessTokenType = {
  userId: number;
  username: string;
  displayName: string;
  dcToken: string;
};

type RefreshTokenType = {
  userId: number;
  username: string;
  displayName: string;
  dcToken: string;
  test: string;
};

export {AccessTokenType, RefreshTokenType};
