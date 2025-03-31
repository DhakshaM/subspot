from django.views import View
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q, Max, Count, F, Case, When, BooleanField
import json

from ..models import Chat, Message, User

@method_decorator(csrf_exempt, name='dispatch')
class ChatListView(LoginRequiredMixin, View):
    """
    View for listing and creating chats
    """
    def get(self, request):
        # Get all chats for the current user
        user = request.user
        
        # First get all chats without complex annotations
        chats = Chat.objects.filter(
            participants=user
        ).prefetch_related(
            'participants', 'messages__sender'
        ).order_by('-created_at')
        
        chat_list = []
        for chat in chats:
            # Get other participant (not the current user)
            other_user = chat.participants.exclude(id=user.id).first()
            
            # Get last message
            last_message = chat.messages.order_by('-created_at').first()
            last_message_data = None
            if last_message:
                last_message_data = {
                    'id': last_message.id,
                    'text': last_message.text,
                    'sender_id': last_message.sender.id,
                    'created_at': last_message.created_at.strftime('%Y-%m-%d %H:%M:%S')
                }
            
            # Count unread messages manually instead of using annotation
            unread_count = Message.objects.filter(
                chat=chat,
                is_read=False
            ).exclude(sender=user).count()
            
            # Build chat data
            chat_data = {
                'id': chat.id,
                'other_participant': {
                    'id': other_user.id if other_user else None,
                    'username': other_user.username if other_user else None,
                    'name': getattr(other_user, 'name', '') if other_user else None
                },
                'last_message': last_message_data,
                'unread_count': unread_count,
                'created_at': chat.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': chat.updated_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(chat, 'updated_at') else chat.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
            chat_list.append(chat_data)
        
        # Sort by last message time if available
        chat_list = sorted(
            chat_list, 
            key=lambda x: x['last_message']['created_at'] if x['last_message'] else x['created_at'],
            reverse=True
        )
        
        return JsonResponse(chat_list, safe=False)

@method_decorator(csrf_exempt, name='dispatch')
class ChatDetailView(LoginRequiredMixin, View):
    """
    View for retrieving a specific chat with its messages
    """
    def post(self, request):
        try:
            data = request.POST
            chat_id = data.get('chat_id')
            
            if not chat_id:
                return JsonResponse({'error': 'Chat ID is required'}, status=400)
            
            # Get the chat and verify the user is a participant
            chat = Chat.objects.prefetch_related('participants', 'messages__sender').get(
                id=chat_id, participants=request.user
            )
            
            # Mark all messages as read
            Message.objects.filter(
                chat=chat,
                is_read=False
            ).exclude(sender=request.user).update(is_read=True)
            
            # Get participants
            participants_data = []
            for participant in chat.participants.all():
                participants_data.append({
                    'id': participant.id,
                    'username': participant.username,
                    'name': getattr(participant, 'name', '')
                })
            
            # Get messages
            messages_data = []
            for message in chat.messages.order_by('created_at'):
                messages_data.append({
                    'id': message.id,
                    'sender_id': message.sender.id,
                    'sender_name': message.sender.username,
                    'text': message.text,
                    'is_read': message.is_read,
                    'created_at': message.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
                
            chat_data = {
                'id': chat.id,
                'participants': participants_data,
                'messages': messages_data,
                'created_at': chat.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': chat.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            return JsonResponse(chat_data)
            
        except Chat.DoesNotExist:
            return JsonResponse({'error': 'Chat not found'}, status=404)

@method_decorator(csrf_exempt, name='dispatch')
class StartChatView(LoginRequiredMixin, View):
    """
    View for starting a new chat with another user
    """
    def post(self, request):
        try:
            data = request.POST
            other_user_id = data.get('user_id')
            
            if not other_user_id:
                return JsonResponse({'error': 'User ID is required'}, status=400)
            
            try:
                other_user = User.objects.get(id=other_user_id)
            except User.DoesNotExist:
                return JsonResponse({'error': 'User not found'}, status=404)
            
            if other_user == request.user:
                return JsonResponse({'error': 'Cannot start chat with yourself'}, status=400)
                
            # Get or create a chat between the users
            chat = Chat.get_or_create_chat(request.user, other_user)
            
            # Get other participant data
            other_user_data = {
                'id': other_user.id,
                'username': other_user.username,
                'name': getattr(other_user, 'name', '')
            }
            
            # Get last message
            last_message = chat.messages.order_by('-created_at').first()
            last_message_data = None
            if last_message:
                last_message_data = {
                    'id': last_message.id,
                    'text': last_message.text,
                    'sender_id': last_message.sender.id,
                    'created_at': last_message.created_at.strftime('%Y-%m-%d %H:%M:%S')
                }
            
            # Count unread messages
            unread_count = chat.messages.filter(is_read=False).exclude(sender=request.user).count()
            
            chat_data = {
                'id': chat.id,
                'other_participant': other_user_data,
                'last_message': last_message_data,
                'unread_count': unread_count,
                'created_at': chat.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': chat.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            return JsonResponse(chat_data)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class MarkMessagesReadView(LoginRequiredMixin, View):
    """
    View for marking messages as read
    """
    def post(self, request):
        try:
            data = request.POST
            chat_id = data.get('chat_id')
            message_ids = data.get('message_ids', [])
            
            if not chat_id:
                return JsonResponse({'error': 'Chat ID is required'}, status=400)
                
            # Get chat and verify user is participant
            chat = get_object_or_404(Chat, id=chat_id)
            if request.user not in chat.participants.all():
                return JsonResponse({'error': 'You are not a participant in this chat'}, status=403)
                
            # Mark specific messages or all unread messages as read
            query = Message.objects.filter(chat=chat, is_read=False).exclude(sender=request.user)
            if message_ids:
                query = query.filter(id__in=message_ids)
                
            updated_count = query.update(is_read=True)
            
            return JsonResponse({
                'message': f"{updated_count} messages marked as read"
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class MessageCreateView(LoginRequiredMixin, View):
    """
    View for creating new messages in a chat
    """
    def post(self, request):
        try:
            data = request.POST
            
            chat_id = data.get('chat_id')
            text = data.get('text')
            reply_to_id = data.get('reply_to_id')  # ID of message being replied to
            
            if not chat_id:
                return JsonResponse({'error': 'Chat ID is required'}, status=400)
            
            if not text:
                return JsonResponse({'error': 'Message text is required'}, status=400)
            
            # Get the chat and verify the user is a participant
            try:
                chat = Chat.objects.get(id=chat_id, participants=request.user)
            except Chat.DoesNotExist:
                return JsonResponse({'error': 'Chat not found or you are not a participant'}, status=404)
            
            # Check if reply_to_id is valid if provided
            reply_to = None
            if reply_to_id:
                try:
                    reply_to = Message.objects.get(id=reply_to_id, chat=chat)
                except Message.DoesNotExist:
                    return JsonResponse({'error': 'Invalid reply message ID'}, status=400)
            
            # Create the message
            message = Message.objects.create(
                chat=chat,
                sender=request.user,
                text=text,
                message_type='text',
                is_read=False,
                reply_to=reply_to
            )
            
            # Update the chat's updated_at timestamp
            chat.save()  # This triggers auto_now
            
            # Get reply info if needed
            reply_data = None
            if message.reply_to:
                reply_data = {
                    'id': message.reply_to.id,
                    'text': message.reply_to.text,
                    'sender_id': message.reply_to.sender.id,
                    'sender_name': message.reply_to.sender.username
                }
            
            # Return the created message
            message_data = {
                'id': message.id,
                'sender_id': message.sender.id,
                'sender_name': message.sender.username,
                'text': message.text,
                'is_read': message.is_read,
                'reply_to': reply_data,
                'created_at': message.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            return JsonResponse(message_data, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)