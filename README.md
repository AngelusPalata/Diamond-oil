# Diamond Oil

Express serves the storefront, seller dashboard, and product images. SQLite stores
products, seller accounts, orders, visitor totals, and seller sessions.

## Production deployment

Use Node.js 22 or newer and install the locked production dependencies with
`npm ci --omit=dev`. Start the service with `npm start`; the server listens on
the hosting platform's `PORT` environment variable.

Set these environment variables in the hosting provider's secret/configuration
settings:

- `NODE_ENV=production`
- `PORT` (normally provided by the host)
- `DATABASE_DIR` set to an **absolute path** on a persistent disk mounted for
  this service, outside the application directory (for example
  `/var/lib/diamond-oil`)
- `SESSION_SECRET` set to a private random value of at least 32 characters
- `SELLER_USERNAME` and `SELLER_PASSWORD` set before the first start; the initial
  password must contain at least 12 characters

The initial seller credentials are used only when the database has no seller
account. Changing these environment values later does not change an existing
seller password; use the seller password-change page instead. Terminate TLS at
the host or reverse proxy so production session cookies remain secure.

### SQLite storage requirements

SQLite is retained and is appropriate for this application's expected low-volume
use when the service runs as **one application instance** with its database on
that instance's persistent local disk. The database and custom session store
use the same `DATABASE_DIR`. The disk must support SQLite file locking. Do not
put this database on an ephemeral filesystem, network/shared filesystem, or a
synchronized folder such as OneDrive, and do not run multiple app instances
against it.

The storefront reads in-stock products from SQLite, so update the inventory
through the seller dashboard. Product cards retain the existing artwork where
it matches a known fragrance and use the collection image for other products.

Persistent disks protect data from ordinary app restarts, but they are not
backups. Schedule regular SQLite-consistent backups and keep copies outside the
hosting volume. To move an existing database, stop the old server first and
copy `diamond_oil.db` to the mounted volume; never commit the database or
`.env` file to Git.

The health endpoint is `GET /api/health`. Deploy the whole Node application
(not only the HTML/CSS files), since the storefront catalog and order submission
use the Express API. Images are served from the repository's `image` directory.
Login attempts are limited per IP in the running process; this limit resets on
restart, which is another reason to keep the service to one instance.

## Cost guidance

The application has no paid service dependency of its own. Staying below
$50/year including a domain depends on current renewal prices, taxes, and the
hosting provider's storage and bandwidth charges. Compare the full annual cost
of a small single-instance VPS and domain before choosing. A free tier with
ephemeral storage is not suitable for this SQLite database, and managed
persistent disks can push the total above this target.
