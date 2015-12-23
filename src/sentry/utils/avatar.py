"""
sentry.utils.avatar
~~~~~~~~~~~~~~~~~~~

:copyright: (c) 2010-2014 by the Sentry Team, see AUTHORS for more details.
:license: BSD, see LICENSE for more details.
"""
from __future__ import absolute_import

import hashlib

from django.conf import settings
from django.utils.http import urlencode


def get_gravatar_url(email, size=None, default='mm'):
    gravatar_url = "%s/avatar/%s" % (settings.SENTRY_GRAVATAR_BASE_URL,
                                     hashlib.md5(email.lower()).hexdigest())

    properties = {}
    if size:
        properties['s'] = str(size)
    if default:
        properties['d'] = default
    if properties:
        gravatar_url += "?" + urlencode(properties)

    return gravatar_url
