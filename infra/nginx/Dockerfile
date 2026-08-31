FROM nginx:alpine

# Remove default configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy OpenWrapper custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose standard HTTP/HTTPS ports
EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 0

CMD ["nginx", "-g", "daemon off;"]
