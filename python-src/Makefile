# ==============================================================================
# HungryGoHappy Flet Companion — Multi-Target Build Automation Makefile
# ==============================================================================
# Targets:
#   make test       - Execute automated unit and regression test suite
#   make run        - Run standalone desktop application with hot-reloading
#   make pip        - Build Python Wheel (.whl) and Source Distribution (.tar.gz)
#   make deb        - Build standard Debian (.deb) binary package
#   make apk        - Build native Android release APK via Flet / Flutter
#   make clean      - Remove build directories, caches, and distribution packages
#   make all        - Build pip, debian, and APK packages in sequence
# ==============================================================================

SHELL := /bin/bash
APP_NAME := hungrygohappy
PACKAGE_NAME := hungrygohappy
VERSION ?= 1.0.0
ARCHITECTURE := all
MAINTAINER := Prathep Narula <prathep@gmail.com>
DESCRIPTION := HungryGoHappy Flet companion application for Android, Desktop, and Web

BUILD_DIR := build
DIST_DIR := dist
DEB_ROOT := $(BUILD_DIR)/deb/$(PACKAGE_NAME)_$(VERSION)_$(ARCHITECTURE)

.PHONY: help test run pip deb apk clean all install-pip install-apk

help:
	@echo "HungryGoHappy Flet Companion — Available Targets:"
	@echo "  make test         - Run all unit and regression test suites"
	@echo "  make run          - Run local desktop application"
	@echo "  make pip          - Build pip packages (.whl and .tar.gz)"
	@echo "  make deb          - Build Debian package (.deb)"
	@echo "  make apk          - Build Android release APK"
	@echo "  make clean        - Remove all build and distribution artifacts"
	@echo "  make all          - Build pip, debian, and APK packages"

# ------------------------------------------------------------------------------
# 1. TEST & DEVELOPMENT
# ------------------------------------------------------------------------------

test:
	@echo "==> Running Python unit and regression test suite..."
	python3 -m unittest discover -s test -v

run:
	@echo "==> Starting HungryGoHappy desktop application..."
	flet run main.py

# ------------------------------------------------------------------------------
# 2. PIP PACKAGE (Wheel & Source Distribution)
# ------------------------------------------------------------------------------

pip: clean-pip
	@echo "==> Building pip distribution packages (Wheel and sdist)..."
	@mkdir -p $(DIST_DIR)
	@python3 -m pip install --upgrade --quiet build
	python3 -m build --outdir $(DIST_DIR)
	@echo "==> Successfully built pip packages in $(DIST_DIR):"
	@ls -la $(DIST_DIR)/*.whl $(DIST_DIR)/*.tar.gz 2>/dev/null || true

install-pip: pip
	@echo "==> Installing locally built wheel..."
	pip install --force-reinstall $$(ls -t $(DIST_DIR)/*.whl | head -n1)

clean-pip:
	@rm -rf $(DIST_DIR)/*.whl $(DIST_DIR)/*.tar.gz $(BUILD_DIR)/lib *.egg-info

# ------------------------------------------------------------------------------
# 3. DEBIAN PACKAGE (.deb)
# ------------------------------------------------------------------------------

deb: clean-deb
	@echo "==> Assembling Debian package structure for $(PACKAGE_NAME)_$(VERSION)_$(ARCHITECTURE)..."
	@mkdir -p $(DIST_DIR)
	@mkdir -p $(DEB_ROOT)/DEBIAN
	@mkdir -p $(DEB_ROOT)/usr/local/bin
	@mkdir -p $(DEB_ROOT)/usr/share/$(PACKAGE_NAME)
	@mkdir -p $(DEB_ROOT)/usr/share/applications

	# Generate Debian control file
	@cat << 'EOF' > $(DEB_ROOT)/DEBIAN/control
Package: $(PACKAGE_NAME)
Version: $(VERSION)
Section: utils
Priority: optional
Architecture: $(ARCHITECTURE)
Depends: python3 (>= 3.10), python3-pip
Maintainer: $(MAINTAINER)
Description: $(DESCRIPTION)
 Companion client for HungryGoHappy restaurant picker with offline caching,
 Lovable Cloud synchronization, and location-based roulette filtering.
EOF

	# Copy application source and dependencies
	@cp main.py $(DEB_ROOT)/usr/share/$(PACKAGE_NAME)/
	@cp requirements.txt $(DEB_ROOT)/usr/share/$(PACKAGE_NAME)/

	# Create executable launcher script
	@cat << 'EOF' > $(DEB_ROOT)/usr/local/bin/$(PACKAGE_NAME)
#!/bin/bash
set -e
export PYTHONPATH="/usr/share/$(PACKAGE_NAME):$$PYTHONPATH"
exec python3 /usr/share/$(PACKAGE_NAME)/main.py "$$@"
EOF
	@chmod 0755 $(DEB_ROOT)/usr/local/bin/$(PACKAGE_NAME)

	# Create XDG desktop menu entry
	@cat << 'EOF' > $(DEB_ROOT)/usr/share/applications/$(PACKAGE_NAME).desktop
[Desktop Entry]
Type=Application
Name=HungryGoHappy
Comment=Where To Eat/Drink Today?
Exec=/usr/local/bin/$(PACKAGE_NAME)
Icon=applications-other
Terminal=false
Categories=Utility;Food;
EOF
	@chmod 0644 $(DEB_ROOT)/usr/share/applications/$(PACKAGE_NAME).desktop

	# Build Debian package binary
	@if command -v dpkg-deb >/dev/null 2>&1; then \
		dpkg-deb --build --root-owner-group $(DEB_ROOT) $(DIST_DIR)/$(PACKAGE_NAME)_$(VERSION)_$(ARCHITECTURE).deb; \
	else \
		echo "dpkg-deb not found; packing via standard ar/tar.gz..."; \
		echo "2.0" > $(DEB_ROOT)/debian-binary; \
		tar -czf $(DEB_ROOT)/control.tar.gz -C $(DEB_ROOT)/DEBIAN .; \
		tar -czf $(DEB_ROOT)/data.tar.gz --exclude=./DEBIAN --exclude=./debian-binary --exclude=./control.tar.gz --exclude=./data.tar.gz -C $(DEB_ROOT) .; \
		ar r $(DIST_DIR)/$(PACKAGE_NAME)_$(VERSION)_$(ARCHITECTURE).deb $(DEB_ROOT)/debian-binary $(DEB_ROOT)/control.tar.gz $(DEB_ROOT)/data.tar.gz; \
	fi
	@echo "==> Successfully generated Debian package:"
	@ls -la $(DIST_DIR)/$(PACKAGE_NAME)_$(VERSION)_$(ARCHITECTURE).deb

clean-deb:
	@rm -rf $(BUILD_DIR)/deb $(DIST_DIR)/*.deb

# ------------------------------------------------------------------------------
# 4. ANDROID APK PACKAGE (.apk)
# ------------------------------------------------------------------------------

apk: clean-apk
	@echo "==> Building native Android release APK via Flet..."
	@mkdir -p $(DIST_DIR)
	flet build apk \
		--project-name "HungryGoHappy" \
		--org "app.lovable.hungrygohappy" \
		--description "Where To Eat/Drink Today?" \
		--build-version "$(VERSION)"
	@if [ -f "$(BUILD_DIR)/apk/app-release.apk" ]; then \
		cp $(BUILD_DIR)/apk/app-release.apk $(DIST_DIR)/$(PACKAGE_NAME)-$(VERSION)-release.apk; \
		echo "==> Successfully built Android APK:"; \
		ls -la $(DIST_DIR)/$(PACKAGE_NAME)-$(VERSION)-release.apk; \
	fi

install-apk:
	@echo "==> Installing release APK to connected Android device..."
	adb install -r $$(ls -t $(DIST_DIR)/*.apk 2>/dev/null || ls -t $(BUILD_DIR)/apk/app-release.apk)

clean-apk:
	@rm -rf $(BUILD_DIR)/apk $(DIST_DIR)/*.apk

# ------------------------------------------------------------------------------
# 5. GENERAL TARGETS
# ------------------------------------------------------------------------------

clean: clean-pip clean-deb clean-apk
	@echo "==> Cleaning temporary build artifacts and __pycache__ directories..."
	@rm -rf $(BUILD_DIR) $(DIST_DIR) *.egg-info .pytest_cache
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true

all: test pip deb apk
	@echo "==> All packages built successfully in $(DIST_DIR):"
	@ls -la $(DIST_DIR)
