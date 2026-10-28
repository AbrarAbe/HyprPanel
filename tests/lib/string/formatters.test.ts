import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    capitalizeFirstLetter,
    toCamelCase,
    toConstantCase,
    toKebabCase,
    toPascalCase,
    toSentenceCase,
    toSnakeCase,
    toTitleCase,
} from '../../../src/lib/string/formatters.ts';

describe('capitalizeFirstLetter', () => {
    it('capitalizes the first letter', () => {
        assert.equal(capitalizeFirstLetter('hello'), 'Hello');
    });

    it('leaves the rest of the string untouched', () => {
        assert.equal(capitalizeFirstLetter('hello world'), 'Hello world');
    });

    it('handles empty strings', () => {
        assert.equal(capitalizeFirstLetter(''), '');
    });
});

describe('toCamelCase', () => {
    it('converts kebab-case', () => {
        assert.equal(toCamelCase('hello-world'), 'helloWorld');
    });

    it('converts mixed separators', () => {
        assert.equal(toCamelCase('hello world-test_case'), 'helloWorldTestCase');
    });

    it('lowercases a leading capital', () => {
        assert.equal(toCamelCase('Hello'), 'hello');
    });
});

describe('toKebabCase', () => {
    it('converts camelCase', () => {
        assert.equal(toKebabCase('helloWorld'), 'hello-world');
    });

    it('converts snake_case', () => {
        assert.equal(toKebabCase('foo_bar'), 'foo-bar');
    });

    it('converts spaces', () => {
        assert.equal(toKebabCase('Foo Bar'), 'foo-bar');
    });
});

describe('toTitleCase', () => {
    it('capitalizes each word', () => {
        assert.equal(toTitleCase('hello world'), 'Hello World');
    });

    it('splits on underscores and hyphens', () => {
        assert.equal(toTitleCase('foo_bar-baz'), 'Foo Bar Baz');
    });
});

describe('toSnakeCase', () => {
    it('converts camelCase', () => {
        assert.equal(toSnakeCase('helloWorld'), 'hello_world');
    });

    it('converts spaces and hyphens', () => {
        assert.equal(toSnakeCase('foo-bar baz'), 'foo_bar_baz');
    });
});

describe('toPascalCase', () => {
    it('converts separated words', () => {
        assert.equal(toPascalCase('hello world-test'), 'HelloWorldTest');
    });

    it('capitalizes a single word', () => {
        assert.equal(toPascalCase('hello'), 'Hello');
    });
});

describe('toConstantCase', () => {
    it('converts camelCase', () => {
        assert.equal(toConstantCase('helloWorld'), 'HELLO_WORLD');
    });

    it('converts spaces', () => {
        assert.equal(toConstantCase('hello world'), 'HELLO_WORLD');
    });
});

describe('toSentenceCase', () => {
    it('capitalizes only the first word', () => {
        assert.equal(toSentenceCase('hello world'), 'Hello world');
    });

    it('normalizes separators to spaces', () => {
        assert.equal(toSentenceCase('hello world-test'), 'Hello world test');
    });

    it('collapses repeated whitespace and trims', () => {
        // Known quirk: capitalization runs before whitespace collapse, so a
        // leading space defeats it ('  hello' stays lowercase). Documented
        // here as-is; fixing it is a behavior change for a later task.
        assert.equal(toSentenceCase('  hello    world  '), 'hello world');
    });
});
