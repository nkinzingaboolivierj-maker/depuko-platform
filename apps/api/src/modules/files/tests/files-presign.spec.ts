import { presign, StorageConfig } from "../presentation/files.controller";

const base: StorageConfig = {
  endpoint: new URL("https://storage.railway.app"),
  bucket: "depuko-private-abc123",
  accessKey: "test-access-key",
  secretKey: "test-secret-key",
  region: "auto",
  urlStyle: "virtual-hosted",
};

describe("Railway S3-compatible presigned URLs", () => {
  it("uses virtual-hosted bucket names by default", () => {
    const url = new URL(presign(base, "PUT", "users/user-1/file-1", 300, "image/png"));
    expect(url.hostname).toBe("depuko-private-abc123.storage.railway.app");
    expect(url.pathname).toBe("/users/user-1/file-1");
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not duplicate the bucket host prefix", () => {
    const config = { ...base, endpoint: new URL("https://depuko-private-abc123.storage.railway.app") };
    const url = new URL(presign(config, "GET", "users/user-1/file-1", 120));
    expect(url.hostname).toBe("depuko-private-abc123.storage.railway.app");
    expect(url.pathname).toBe("/users/user-1/file-1");
  });

  it("supports path-style endpoints when the provider requires them", () => {
    const config = { ...base, urlStyle: "path" as const };
    const url = new URL(presign(config, "HEAD", "users/user-1/file-1", 60));
    expect(url.hostname).toBe("storage.railway.app");
    expect(url.pathname).toBe("/depuko-private-abc123/users/user-1/file-1");
  });
});
