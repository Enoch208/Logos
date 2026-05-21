FROM python:3.13-slim AS build
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

# Install the logos SDK as a wheel into a venv we can copy to the runner.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY logos/pyproject.toml ./logos/pyproject.toml
COPY logos/src ./logos/src
RUN pip install --upgrade pip && pip install ./logos

# Copy the rest of the workspace so the fleet can import specialists.* + fleet.*
COPY fleet ./fleet
COPY specialists ./specialists

FROM python:3.13-slim AS run
WORKDIR /app
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONPATH=/app

# Drop in the prebuilt venv + the source tree
COPY --from=build /opt/venv /opt/venv
COPY --from=build /app/specialists ./specialists
COPY --from=build /app/fleet ./fleet

EXPOSE 8080
CMD ["python", "-m", "fleet.main"]
