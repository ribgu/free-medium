import difflib
import hashlib
import re
import secrets
import string
import urllib.parse
from datetime import datetime
from functools import lru_cache
from urllib.parse import parse_qs, urlparse

import aiohttp
import tld
from aiohttp_retry import RetryClient
from async_lru import alru_cache
from bs4 import BeautifulSoup
from loguru import logger

import { InvalidURL, InvalidMediumPostURL, PageLoadingError } from './exceptions';
import { retryOptions } from './config';

const DEFAULT_URL_PROTOCOL = "https://";

const VALID_ID_CHARS = new Set([...string.ascii_letters, ...string.digits]);

const KNOWN_MEDIUM_CUSTOM_DOMAINS = [
  "javascript.plainenglish.io",
  "blog.llamaindex.ai",
  "code.likeagirl.io",
  "medium.datadriveninvestor.com",
  "blog.det.life",
  "python.plainenglish.io",
  "blog.stackademic.com",
  "ai.gopubby.com",
  "blog.devops.dev",
  "levelup.gitconnected.com",
  "betterhumans.coach.me",
  "ai.plainenglish.io",
];
const KNOWN_MEDIUM_DOMAINS = [
  "medium.com",
  "uxplanet.org",
  "osintteam.blog",
  "ahmedelfakharany.com",
  "drlee.io",
  "artificialcorner.com",
  "generativeai.pub",
  "productcoalition.com",
  "towardsdev.com",
  "infosecwriteups.com",
  "towardsdatascience.com",
  "thetaoist.online",
  "devopsquare.com",
  "laceydearie.com",
  "bettermarketing.pub",
  "itnext.io",
  "eand.co",
  "betterprogramming.pub",
  "curiouse.co",
  "betterhumans.pub",
  "uxdesign.cc",
  "thebolditalic.com",
  "arcdigital.media",
  "codeburst.io",
  "psiloveyou.xyz",
  "writingcooperative.com",
  "entrepreneurshandbook.co",
  "prototypr.io",
  "theascent.pub",
  "storiusmag.com",
];
const NOT_MEDIUM_DOMAINS = [
  "github.com",
  "yandex.ru",
  "yandex.kz",
  "youtube.com",
  "nytimes.com",
  "wsj.com",
  "reddit.com",
  "elpais.com",
  "forbes.com",
  "bloomberg.com",
  "lesechos.fr",
  "otz.de",
  "businessinsider.com",
  "buff.ly",
  "delish.com",
  "economist.com",
  "wired.com",
  "rollingstone.com",
];

export function isValidUrl(url: string): boolean {
  const fld = getFld(url);
  if (!fld) {
    return false;
  }

  const parsedUrl = urlparse(url);
  return Boolean(parsedUrl.scheme && parsedUrl.netloc);
}

export function gettingPercentageOfMatch(string: string, matchedString: string): number {
  if (!string || !matchedString) {
    return 0.0;
  }

  return difflib.SequenceMatcher(null, string, matchedString).ratio() * 100;
}

export function generateRandomSha256Hash(): string {
  const randomInputBytes = secrets.token_bytes();
  const sha256Hash = hashlib.sha256();
  sha256Hash.update(randomInputBytes);
  return sha256Hash.hexdigest();
}

export function getUnixMs(): number {
  const currentDateTime = new Date();
  return currentDateTime.getTime();
}

export function unquerifyUrl(url: string): string {
  const parsedUrl = urlparse(url);
  const query = parsedUrl.query;
  if (query) {
    parsedUrl.query = "";
  }

  const sanitizedUrl = urlunparse(parsedUrl);
  return sanitizedUrl.replace(/\/$/, "");
}

@lru_cache(500)
export function unWwwify(url: string): string {
  if (url.startsWith("www.")) {
    return url.replace(/^www\./, "");
  }
  return url;
}

export function correctUrl(url: string): string {
  const unsafariUrl = url;
  const unquerifiedUrl = unquerifyUrl(unsafariUrl);
  const unplaginatedUrl = unplaginateUrl(unquerifiedUrl);
  return url;
}

export function unplaginateUrl(url: string): string {
  return url.replace(/\/page\/2$/, "").replace(/\/$/, "");
}

@lru_cache(100)
export function isHasValidMediumPostId(hexString: string): boolean {
  return extractHexString(hexString) !== null;
}

@lru_cache(100)
export function basicHexCheck(hexString: string): boolean {
  for (const char of hexString) {
    if (!VALID_ID_CHARS.has(char)) {
      return false;
    }
  }

  if (hexString.length < 8 || hexString.length > 12) {
    return false;
  }

  return true;
}

@lru_cache(100)
export function extractHexString(inputString: string): string | null {
  let match = inputString.match(/-(\b[a-fA-F0-9]{8,12}\b)/);
  if (!match) {
    match = inputString.match(/(\b[a-fA-F0-9]{8,12}\b)/);
  }
  return match ? match[0] : null;
}

export async function resolveMediumShortLink(shortUrlId: string, timeout: number = 5): Promise<string> {
  const session = new aiohttp.ClientSession();
  const retryClient = new RetryClient({
    clientSession: session,
    raiseForStatus: false,
    retryOptions: retryOptions,
  });
  const request = await retryClient.get(`https://rsci.app.link/${shortUrlId}`, {
    timeout: timeout,
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
    },
    allowRedirects: false,
  });
  const postUrl = request.headers["Location"];
  return postUrl;
}

@alru_cache(500)
export async function resolveMediumUrl(url: string, timeout: number = 5): Promise<string> {
  const parsedUrl = urlparse(url);
  const parsedNetloc = unWwwify(parsedUrl.netloc);

  if (parsedUrl.path.startsWith("/p/")) {
    const postId = parsedUrl.path.split("/p/")[1];
    return postId;
  }

  if (parsedNetloc === "l.facebook.com" && parsedUrl.path.startsWith("/l.php")) {
    const parsedQuery = parse_qs(parsedUrl.query);
    if (parsedQuery["u"] && parsedQuery["u"].length === 1) {
      const postUrl = parsedQuery["u"][0];
      return await resolveMediumUrl(postUrl);
    }
    return "";
  }

  if (parsedNetloc === "webcache.googleusercontent.com" && parsedUrl.path.startsWith("/search")) {
    const parsedQuery = parse_qs(parsedUrl.query);
    if (parsedQuery["q"] && parsedQuery["q"].length === 1) {
      const postUrl = parsedQuery["q"][0].replace(/^cache:/, "");
      return await resolveMediumUrl(postUrl);
    }
    return "";
  }

  if (parsedNetloc === "google.com" && parsedUrl.path.startsWith("/url")) {
    const parsedQuery = parse_qs(parsedUrl.query);
    if (parsedQuery["url"] && parsedQuery["url"].length === 1) {
      const postUrl = parsedQuery["url"][0];
      return await resolveMediumUrl(postUrl);
    }
    if (parsedQuery["q"] && parsedQuery["q"].length === 1) {
      const postUrl = parsedQuery["q"][0];
      return await resolveMediumUrl(postUrl);
    }
    return "";
  }

  if (parsedNetloc === "12ft.io") {
    const parsedQuery = parse_qs(parsedUrl.query);
    if (parsedQuery["q"] && parsedQuery["q"].length === 1) {
      const postUrl = parsedQuery["q"][0];
      return await resolveMediumUrl(postUrl);
    }
    return "";
  }

  if (parsedUrl.path.startsWith("/m/global-identity-2")) {
    const parsedQuery = parse_qs(parsedUrl.query);
    if (parsedQuery["redirectUrl"] && parsedQuery["redirectUrl"].length === 1) {
      const postUrl = parsedQuery["redirectUrl"][0];
      return await resolveMediumUrl(postUrl);
    }
    return "";
  }

  if (parsedNetloc === "link.medium.com") {
    const shortUrlId = parsedUrl.path.replace(/^\//, "");
    const postUrl = await resolveMediumShortLink(shortUrlId, timeout);
    return await resolveMediumUrl(postUrl);
  }

  const postUrl = parsedUrl.path.split("/").pop();
  const postId = postUrl.split("-").pop();

  if (!isHasValidMediumPostId(postId)) {
    return "";
  }

  return postId;
}

export async function isValidMediumUrl(url: string): Promise<boolean> {
  const domain = getFld(url);
  const parsedUrl = urlparse(url);
  const domainNetloc = unWwwify(parsedUrl.netloc);

  if (domain === "12ft.io" || domain === "google.com" || domain === "facebook.com" || domain === "googleusercontent.com") {
    return true;
  }

  if (NOT_MEDIUM_DOMAINS.includes(domain) || NOT_MEDIUM_DOMAINS.includes(domainNetloc)) {
    throw new InvalidURL("100% not valid Medium URL");
  }

  if (KNOWN_MEDIUM_DOMAINS.includes(domain) || KNOWN_MEDIUM_CUSTOM_DOMAINS.includes(domainNetloc)) {
    return true;
  }

  const resolveResult = Boolean(await resolveMediumUrl(url));
  return resolveResult;
}

@lru_cache(500)
export function getFld(url: string): string | null {
  try {
    return tld.get_fld(url);
  } catch (ex) {
    return null;
  }
}
