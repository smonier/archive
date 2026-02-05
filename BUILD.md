# Build Instructions

## Initial Setup (First Time Only)

Before building the module for the first time, ensure dependencies are installed:

```bash
# Navigate to module directory
cd /Users/stephane/Runtimes/0.Modules/archive

# Install Node.js dependencies
npm install
# This installs all dependencies from package.json

# OR if using Yarn
yarn install
```

## Build Commands

### Option 1: Full Build (Recommended)

```bash
# Clean, install dependencies, build frontend, build module
mvn clean install
```

This command will:
1. Clean previous build artifacts
2. Install/update node dependencies (via frontend-maven-plugin)
3. Build frontend assets with Webpack
4. Compile Java code (if any)
5. Package the module as JAR

**Output**: `target/archive-1.0-SNAPSHOT.jar`

### Option 2: Frontend Only

```bash
# Build frontend assets with Webpack
npm run webpack

# OR for production build
npm run build:production
```

**Output**: `src/main/resources/javascript/apps/jahia.bundle.js`

### Option 3: Quick Rebuild (After Code Changes)

```bash
# Skip tests and dependency checks
mvn clean install -DskipTests -Dfrontend.skip=false
```

## Development Mode

### Watch Mode (Auto-rebuild on file changes)

```bash
# Terminal 1: Watch and rebuild frontend on changes
npm run dev

# Terminal 2: Keep this running for hot reload
# (Files in src/main/resources/javascript/apps/ will update automatically)
```

Then refresh your browser to see changes.

### Build with Analysis

```bash
# Analyze bundle size and dependencies
npm run build:analyze

# Opens browser with bundle analyzer visualization
```

## Common Build Issues

### Issue: "yarn not found" or "Cannot run program yarn"

**Solution**: Install dependencies first
```bash
npm install
# Then retry build
mvn clean install
```

### Issue: "node/yarn/dist/bin/yarn: No such file or directory"

**Solution**: This is normal if dependencies aren't installed yet. Run:
```bash
npm install
```

Or let Maven handle it:
```bash
mvn clean install
# Maven will download and install node/yarn automatically
```

### Issue: "Module build failed: Error: Cannot find module"

**Solution**: Clean and reinstall
```bash
npm run clean
npm install
npm run webpack
```

### Issue: Frontend build fails with memory error

**Solution**: Increase Node.js memory
```bash
# Already configured in package.json scripts:
# "webpack": "node --max_old_space_size=2048 ./node_modules/.bin/webpack"

# If still failing, increase further:
node --max_old_space_size=4096 ./node_modules/.bin/webpack
```

## Build Artifacts

After successful build:

```
target/
├── archive-1.0-SNAPSHOT.jar          # Main module artifact
├── classes/
│   ├── javascript/
│   │   └── locales/                  # Copied localization files
│   └── META-INF/
│       └── definitions.cnd           # JCR node types
└── ...

src/main/resources/javascript/apps/
├── jahia.bundle.js                   # Main frontend bundle
├── package.json                      # Package metadata
└── *.jahia.*.js                      # Code-split chunks
```

## Deploy to Jahia

### Method 1: Maven Deploy

```bash
# Deploy to running Jahia instance
mvn jahia:deploy

# Requires jahia-maven-plugin configuration in pom.xml
```

### Method 2: Manual Copy

```bash
# Copy JAR to Jahia modules directory
cp target/archive-*.jar $JAHIA_HOME/digital-factory-data/modules/

# Jahia will auto-deploy the module
```

### Method 3: Module Manager (UI)

1. Build the JAR: `mvn clean install`
2. Open Jahia: Administration → Server Settings → Modules
3. Click "Upload Module"
4. Select `target/archive-1.0-SNAPSHOT.jar`
5. Click "Install"

## Verify Build

### Check JAR Contents

```bash
# List contents of built JAR
jar tf target/archive-1.0-SNAPSHOT.jar | grep -E "(javascript|META-INF|import)"

# Should include:
# - javascript/apps/jahia.bundle.js
# - javascript/locales/*.json
# - META-INF/definitions.cnd
# - import/permissions.xml
# - import/roles.xml
```

### Check Frontend Build

```bash
# Verify bundle was created
ls -lh src/main/resources/javascript/apps/jahia.bundle.js

# Check bundle size (should be ~200-300 KB)
```

### Lint Check (Before Build)

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Production Build

For production deployment:

```bash
# Build with production optimizations
npm run build:production
mvn clean install -Pproduction

# Results in:
# - Minified JavaScript
# - Source maps
# - Optimized chunks
# - Production-mode React (smaller, faster)
```

## Clean Build

If you encounter persistent issues:

```bash
# Nuclear option: clean everything
npm run clean:all
rm -rf node_modules node
rm -rf target

# Reinstall and rebuild
npm install
mvn clean install
```

## Build Performance

Typical build times:
- **First build**: 2-3 minutes (includes dependency download)
- **Incremental build**: 30-60 seconds
- **Frontend only**: 10-20 seconds
- **Watch mode rebuild**: 3-5 seconds

## Troubleshooting

### Problem: Build succeeds but module doesn't work in Jahia

**Check:**
1. Module started in Module Manager (green indicator)
2. Browser console for JavaScript errors
3. Jahia logs: `tail -f $JAHIA_HOME/tomcat/logs/jahia.log`

### Problem: "Cannot resolve module" errors in browser

**Solution**: Rebuild with proper externals
```bash
# Ensure @jahia/* packages are externalized
# Check webpack.config.js ModuleFederationPlugin configuration
npm run webpack
```

### Problem: Changes not reflected after rebuild

**Solution**: Clear Jahia cache
1. Restart Jahia, OR
2. Hard refresh browser: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
3. Clear browser cache

## CI/CD Integration

For automated builds:

```bash
#!/bin/bash
# build.sh

set -e  # Exit on error

echo "Starting build..."

# Clean
mvn clean

# Install dependencies
npm install

# Lint
npm run lint

# Build
npm run build:production

# Package
mvn install -DskipTests

echo "Build complete: target/archive-1.0-SNAPSHOT.jar"
```

## Quick Reference

| Command | Purpose | Time |
|---------|---------|------|
| `mvn clean install` | Full build | 2-3 min |
| `npm run webpack` | Frontend only | 10-20 sec |
| `npm run dev` | Watch mode | Continuous |
| `npm run lint` | Check code style | 5 sec |
| `npm run lint:fix` | Fix code style | 10 sec |
| `mvn jahia:deploy` | Deploy to Jahia | 30 sec |

---

**Ready to build?** Run: `mvn clean install`
