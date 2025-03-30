from django.db import models
from django.conf import settings  
from django.contrib.auth import get_user_model

User = get_user_model()

class Chat(models.Model):
    """
    Represents a chat or conversation.
    Could be 1-on-1 or group chat.
    """
    name = models.CharField(max_length=255, blank=True, null=True)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chats')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name if self.name else f"Chat #{self.pk}"

class Message(models.Model):
    """
    Represents a single message in a chat.
    """
    MESSAGE_TYPE_CHOICES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('pdf', 'PDF'),
        ('file', 'File'),
        ('deleted', 'Deleted'),
    )

    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')

    text = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='chat_files/', blank=True, null=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default='text')
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Message #{self.pk} in Chat #{self.chat_id} by {self.sender}"
