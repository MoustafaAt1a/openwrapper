namespace OpenWrapper.Models;

public sealed class ListEnvelope<T>
{
    public required List<T> Data { get; init; }
    public bool? HasMore { get; init; }
}
