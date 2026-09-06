namespace OpenWrapper;

public static class Money
{
    public static long ToMinorUnits(decimal amount, int decimals = 2)
    {
        var factor = (decimal)Math.Pow(10, decimals);
        return (long)Math.Round(amount * factor, MidpointRounding.AwayFromZero);
    }

    public static string FormatMajorUnits(long minorUnits, int decimals = 2)
    {
        if (decimals == 0) return minorUnits.ToString();
        var isNegative = minorUnits < 0;
        var abs = Math.Abs(minorUnits);
        var factor = (long)Math.Pow(10, decimals);
        var whole = abs / factor;
        var fraction = (abs % factor).ToString().PadLeft(decimals, '0');
        return $"{(isNegative ? "-" : "")}{whole}.{fraction}";
    }
}
