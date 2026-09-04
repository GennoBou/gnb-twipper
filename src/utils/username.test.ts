import { describe, it, expect } from "vitest";
import { extractUsername } from "./username";

describe("extractUsername", () => {
  it("空文字または空白のみの入力に対して空文字を返すこと", () => {
    expect(extractUsername("")).toBe("");
    expect(extractUsername("   ")).toBe("");
  });

  it("単純なユーザー名および@付きユーザー名を小文字にして返すこと", () => {
    expect(extractUsername("streamer123")).toBe("streamer123");
    expect(extractUsername("Streamer123")).toBe("streamer123");
    expect(extractUsername("@Streamer123")).toBe("streamer123");
  });

  it("httpおよびhttpsの完全なURLからユーザー名を正しく抽出すること", () => {
    expect(extractUsername("https://www.twitch.tv/streamer123")).toBe("streamer123");
    expect(extractUsername("http://twitch.tv/streamer123")).toBe("streamer123");
    expect(extractUsername("https://www.twitch.tv/streamer123/about")).toBe("streamer123");
    expect(extractUsername("https://www.twitch.tv/Streamer123/videos")).toBe("streamer123");
  });

  it("プロトコル無しのtwitch.tv URLからユーザー名を抽出すること", () => {
    expect(extractUsername("twitch.tv/streamer123")).toBe("streamer123");
    expect(extractUsername("www.twitch.tv/Streamer123")).toBe("streamer123");
    expect(extractUsername("twitch.tv/streamer123/clip/12345")).toBe("streamer123");
  });

  it("前後に余分な空白がある場合でもトリムして正しく処理すること", () => {
    expect(extractUsername("   https://www.twitch.tv/streamer123   ")).toBe("streamer123");
    expect(extractUsername("   @streamer123   ")).toBe("streamer123");
  });
});
