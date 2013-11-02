#!/bin/bash -e

# Sanity check. This stops the CGI script from accidentally being used by
# HTML code (as opposed to Javascript).
[ "${HTTP_X_IGUTSCHKE}" = "1" ] || { echo; exit 0; }

# Extract query parameters. We currently only support GET requests with the
# two mandatory parameters "req" and "s". "len" is an optional parameter
# determining the desired (approximate) size of a returned XML feed.
unset req s
IFS='&' read -a query < <(printf '%s' "${QUERY_STRING//\\/\\\\}") || :
i="${#query[@]}"; while [ $i  -gt 0 ]; do
  i=$[i-1];
  q="${query[$i]}"
  k="${q%%=*}"; printf -v k '%b' "${k//\%/\x}"
  v="${q#*=}";  printf -v v '%b' "${v//\%/\x}"
  case "${k}" in
    req) req="${v}";;
    s)   s="${v}";;
    len) len="${v}";;
  esac
done
[ -z "${req}" -o -z "${s}" ] && exit 1

# Look up the matching "req" request in "proxy.conf". Then use "printf" to
# substitute the "%s" field with the contents of "s".
url="$(awk "/^${req//\//\\/}[\t ]/ { print \$2 }" proxy.conf 2>/dev/null)"
url="$(printf "${url}" "${s}")"

# Forward the request, then return sanitized headers and body. Possibly
# truncate data.
get() {
  GET -e "${url}" -t 15 2>&1 |
    sed '1d;2,/^$/{s/$//;/^.$/b;/^\(MIME[^:]*\|Cache-Control\|Date\|Pragma\|Content-Type\):/b;d}'
}
printf 'HTTP/1.0 200 OK\r\n'
if [ -n "${len}" ]; then
  c="$(get | { dd bs="${len}" count=1 2>/dev/null;   sed 's,<item.*</item>,,'; })"
else
  c="$(get)"
fi
len="$(printf '%s' "${c#*

}" | wc -c)"
printf '%s' "${c/
/
Content-Length: ${len}
Pragma: no-cache
Expires: 0
}"
