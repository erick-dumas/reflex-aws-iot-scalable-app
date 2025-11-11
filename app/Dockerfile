##############################
# Stage 1: Builder
##############################
FROM python:3.13 AS builder
ARG REDIS_URL="redis://localhost"

ENV REDIS_URL=$REDIS_URL

WORKDIR /app
COPY requirements.txt .

RUN pip install --upgrade pip 
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN reflex export

RUN unzip frontend.zip -d frontend
RUN rm frontend.zip
RUN unzip backend.zip -d backend
RUN rm backend.zip

##############################
# Stage 2: Runtime
##############################
FROM python:3.13-slim
ARG REDIS_URL="redis://localhost"

ENV REDIS_URL=$REDIS_URL

RUN apt-get update && apt-get install -y unzip curl

WORKDIR /app

COPY --from=builder /app/backend ./
COPY --from=builder /app/frontend ./

RUN pip install --upgrade pip 
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 3000 8000

STOPSIGNAL SIGKILL

CMD ["reflex", "run", "--env", "prod"]