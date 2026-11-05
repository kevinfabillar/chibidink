using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ChibiDink.Application.Common;
using ChibiDink.Domain.Common;

namespace ChibiDink.Api.Infrastructure;

/// <summary>Turns known exceptions into consistent problem+json responses with user-safe messages.</summary>
internal sealed class ProblemExceptionHandler(IProblemDetailsService problems, ILogger<ProblemExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        // The request ran past its time limit.
        if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return true;
        }

        var (status, title, detail) = exception switch
        {
            NotFoundException e => (StatusCodes.Status404NotFound, "Not found", e.Message),
            ForbiddenException e => (StatusCodes.Status403Forbidden, "Not allowed", e.Message),
            UnauthorizedAccessException e => (StatusCodes.Status401Unauthorized, "Sign in required", e.Message),
            ConflictException e => (StatusCodes.Status409Conflict, "Conflict", e.Message),
            DomainException e => (StatusCodes.Status400BadRequest, "Not possible", e.Message),
            _ => (StatusCodes.Status500InternalServerError, "Unexpected error", "Something went wrong. Please try again."),
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception for {Path}", context.Request.Path);

        context.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = exception,
            ProblemDetails = new ProblemDetails { Status = status, Title = title, Detail = detail },
        });
    }
}
