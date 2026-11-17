<?php
declare(strict_types=1);

/**
 * Cloudflare Turnstile on the suggestion form: the widget's keys come from
 * config.php ('turnstile' => site_key, secret, hostname), and the server checks
 * each token with Cloudflare's siteverify before a suggestion is saved.
 * No keys in the config = Turnstile off (no widget, no check).
 */
final class Turnstile
{
    public const FIELD = 'cf-turnstile-response';
    private const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    private const TIMEOUT_S  = 5;

    /** @var array{site_key: string, secret: string, hostname: string}|false|null */
    private static array|false|null $config = null;

    /** @return array{site_key: string, secret: string, hostname: string}|null */
    public static function config(): ?array
    {
        if (self::$config === null) {
            $all = require __DIR__ . '/../config.php';
            $t = (array) ($all['turnstile'] ?? []);
            $c = [
                'site_key' => (string) ($t['site_key'] ?? ''),
                'secret'   => (string) ($t['secret'] ?? ''),
                'hostname' => (string) ($t['hostname'] ?? ''),
            ];
            self::$config = $c['site_key'] !== '' && $c['secret'] !== '' ? $c : false;
        }
        return self::$config ?: null;
    }

    /**
     * Asks siteverify about one token. Null = passed; otherwise why not, for
     * the error log ('unreachable' when Cloudflare did not answer).
     *
     * @param array{site_key: string, secret: string, hostname: string} $config
     */
    public static function verify(array $config, string $token, ?string $ip): ?string
    {
        if ($token === '' || strlen($token) > 2048) {
            return 'no token';
        }
        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => 'Content-Type: application/x-www-form-urlencoded',
            'content'       => http_build_query(['secret' => $config['secret'], 'response' => $token, 'remoteip' => $ip]),
            'timeout'       => self::TIMEOUT_S,
            'ignore_errors' => true,
        ]]);
        $body = @file_get_contents(self::SITEVERIFY, false, $ctx);
        $data = is_string($body) ? json_decode($body, true) : null;
        return self::check(is_array($data) ? $data : null, $config['hostname']);
    }

    /**
     * Reads a siteverify answer: success, and the token was issued on our host.
     *
     * @param array<mixed>|null $response decoded JSON, null when there was none
     */
    public static function check(?array $response, string $hostname): ?string
    {
        if ($response === null) {
            return 'unreachable';
        }
        if (($response['success'] ?? false) !== true) {
            $codes = (array) ($response['error-codes'] ?? []);
            return 'rejected: ' . ($codes ? implode(', ', array_map('strval', $codes)) : 'no error code');
        }
        if (($response['hostname'] ?? null) !== $hostname) {
            return 'wrong hostname: ' . (string) ($response['hostname'] ?? '');
        }
        return null;
    }
}
