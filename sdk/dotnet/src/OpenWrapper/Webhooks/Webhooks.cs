using System.Security.Cryptography;
using System.Text;

namespace OpenWrapper;

public static class Webhooks
{
    public static string ComputeSignature(string payload, string secret, long timestamp)
    {
        ArgumentNullException.ThrowIfNull(payload);
        ArgumentNullException.ThrowIfNull(secret);

        var toSign = $"{timestamp}.{payload}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(toSign));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static bool VerifySignature(
        string payload,
        string header,
        string secret,
        int toleranceSeconds = 300)
    {
        if (string.IsNullOrEmpty(payload) || string.IsNullOrEmpty(header) || string.IsNullOrEmpty(secret))
            return false;

        long? timestamp = null;
        var signatures = new List<string>();

        foreach (var item in header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var parts = item.Split('=', 2, StringSplitOptions.TrimEntries);
            if (parts.Length == 2)
            {
                if (parts[0] == "t" && long.TryParse(parts[1], out var t))
                {
                    timestamp = t;
                }
                else if (parts[0] == "v1")
                {
                    signatures.Add(parts[1]);
                }
            }
        }

        if (timestamp is null || signatures.Count == 0)
            return false;

        if (toleranceSeconds > 0)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (Math.Abs(now - timestamp.Value) > toleranceSeconds)
                return false;
        }

        var expectedHex = ComputeSignature(payload, secret, timestamp.Value);
        byte[] expectedBytes;
        try
        {
            expectedBytes = Convert.FromHexString(expectedHex);
        }
        catch (FormatException)
        {
            return false;
        }

        foreach (var sig in signatures)
        {
            try
            {
                var sigBytes = Convert.FromHexString(sig);
                if (sigBytes.Length == expectedBytes.Length &&
                    CryptographicOperations.FixedTimeEquals(sigBytes, expectedBytes))
                {
                    return true;
                }
            }
            catch (FormatException)
            {
                continue;
            }
        }

        return false;
    }
}
