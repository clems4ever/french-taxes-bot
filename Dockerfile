FROM openintent/chatbot
MAINTAINER Clement Michaud

# Webhook port
EXPOSE 5000

ADD entrypoint.sh /entrypoint.sh

ENTRYPOINT "/entrypoint.sh"
