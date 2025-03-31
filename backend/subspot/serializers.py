from rest_framework import serializers
from .models import User, Subscription, Listing, FriendConnection, MonthlyExpense , Message, Chat

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)  

    class Meta:
        model = Subscription
        fields = '__all__'

class ListingSerializer(serializers.ModelSerializer):
    subscription = SubscriptionSerializer(read_only=True)  

    class Meta:
        model = Listing
        fields = '__all__'

class FriendConnectionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    friend = UserSerializer(read_only=True)

    class Meta:
        model = FriendConnection
        fields = '__all__'

class MonthlyExpenseSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MonthlyExpense
        fields = '__all__'

# ...existing code...

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'chat', 'sender_id', 'sender_name', 'text', 'is_read', 'created_at']
        read_only_fields = ['sender_id', 'sender_name', 'is_read']

    def get_sender_name(self, obj):
        return obj.sender.username if obj.sender else None
    
    def create(self, validated_data):
        # Set sender to current user
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class ChatSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = ['id', 'other_participant', 'last_message', 'unread_count', 'created_at', 'updated_at']
    
    def get_other_participant(self, obj):
        # Get the user that isn't the current user
        request = self.context.get('request')
        current_user = request.user if request else None
        
        if current_user:
            other_user = obj.participants.exclude(id=current_user.id).first()
            if other_user:
                return {
                    'id': other_user.id,
                    'username': other_user.username,
                    'name': other_user.name
                }
        return None
    
    def get_last_message(self, obj):
        last_message = obj.messages.last()
        if last_message:
            return {
                'id': last_message.id,
                'text': last_message.text,
                'sender_id': last_message.sender.id,
                'created_at': last_message.created_at
            }
        return None
        
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()


class ChatDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    participants = UserSerializer(many=True, read_only=True)
    
    class Meta:
        model = Chat
        fields = ['id', 'participants', 'messages', 'created_at', 'updated_at']
