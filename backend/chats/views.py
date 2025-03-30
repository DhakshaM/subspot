from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Chat, Message
from .serializers import ChatSerializer, MessageSerializer

class ChatViewSet(viewsets.ModelViewSet):
    """
    A simple ViewSet for listing, creating, retrieving, updating, or deleting Chats.
    """
    queryset = Chat.objects.all()
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Optionally, if you want the creating user to be added as a participant
        chat = serializer.save()
        chat.participants.add(self.request.user)
        chat.save()

    def get_queryset(self):
        # If you only want to show chats the user participates in:
        return Chat.objects.filter(participants=self.request.user)

class MessageViewSet(viewsets.ModelViewSet):
    """
    A simple ViewSet for listing, creating, retrieving, updating, or deleting Messages.
    """
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # If you only want messages from chats that the user is a participant of:
        return Message.objects.filter(chat__participants=self.request.user)

    def create(self, request, *args, **kwargs):
        # Let the serializer handle setting sender as the logged-in user
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy() to implement 'delete for me' vs 'delete for all'.
        For now, we’ll do a real delete. You can adapt logic to mark as 'deleted'.
        """
        instance = self.get_object()
        # Example logic: if you want to actually remove the message:
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
