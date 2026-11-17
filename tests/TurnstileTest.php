<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;

/** Answers in tests/fixtures/ are real siteverify replies to Cloudflare's test secrets. */
final class TurnstileTest extends TestCase
{
    /** @return array<mixed> */
    private static function reply(string $name): array
    {
        return json_decode((string) file_get_contents(__DIR__ . "/fixtures/siteverify-$name.json"), true);
    }

    #[TestDox('check: a pass on our host, a refusal with its error codes, the wrong host, no answer')]
    public function testCheck(): void
    {
        $pass = self::reply('pass');
        $this->assertNull(Turnstile::check($pass, 'example.com'));
        $this->assertSame('wrong hostname: example.com', Turnstile::check($pass, 'chesscodex.org'));
        $this->assertSame('rejected: invalid-input-response', Turnstile::check(self::reply('fail'), 'example.com'));
        $this->assertSame('rejected: timeout-or-duplicate', Turnstile::check(self::reply('used'), 'example.com'));
        $this->assertSame('unreachable', Turnstile::check(null, 'example.com'));
    }

    #[TestDox('verify: no token or an oversized one is refused without asking Cloudflare')]
    public function testVerifyWithoutToken(): void
    {
        $config = ['site_key' => 'k', 'secret' => 's', 'hostname' => 'example.com'];
        $this->assertSame('no token', Turnstile::verify($config, '', null));
        $this->assertSame('no token', Turnstile::verify($config, str_repeat('a', 2049), null));
    }
}
