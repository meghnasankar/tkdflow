/* Compatibility for static hosts; Vercel redirects this route before serving it. */
const destination=new URL('/community.html',location.origin);
destination.search=location.search;destination.hash=location.hash;
location.replace(destination.href);
