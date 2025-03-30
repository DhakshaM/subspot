from rest_framework import serializers
from .models import Chat, Message
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')  # or whichever fields you need

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    reply_to = serializers.PrimaryKeyRelatedField(
        queryset=Message.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = Message
        fields = (
            'id',
            'chat',
            'sender',
            'text',
            'file',
            'message_type',
            'reply_to',
            'created_at',
            'updated_at',
        )

    def create(self, validated_data):
        # If you want to automatically set the sender to the logged-in user
        request = self.context.get('request', None)
        if request and request.user.is_authenticated:
            validated_data['sender'] = request.user
        return super().create(validated_data)


class ChatSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True, source='messages')

    class Meta:
        model = Chat
        fields = ('id', 'name', 'participants', 'messages', 'created_at')
