import { createContext } from "react";

const SpotifySearchContext = createContext({
  result: null,
  setResult: (_: any) => {},
});

export default SpotifySearchContext;
