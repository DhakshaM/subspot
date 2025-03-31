from django.http import JsonResponse
from django.views import View
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.mixins import LoginRequiredMixin
import json

from ..models import User, FriendConnection

@method_decorator(csrf_exempt, name='dispatch')
class UsersWithMutualFriendsView(LoginRequiredMixin, View):
    def get(self, request):
        
        # get a list of all users with the count of mutual friends with the current user.
        
        current_user = request.user
        
        # get ids of current user's friends (accepted status only)
        current_user_friend_ids = FriendConnection.get_friend_ids(current_user)
        
        # get all users except current user and current user's friends
        users = User.objects.exclude(id=current_user.id).exclude(id__in=current_user_friend_ids)
        
        # calculate mutual friends and existing connection status for each user
        result = []
        for user in users:
            # get this user's friends
            user_friend_ids = FriendConnection.get_friend_ids(user)
            
            # calculate mutual friends (intersection of friend lists)
            mutual_friends_count = len(set(current_user_friend_ids) & set(user_friend_ids))
            
            # check connection status
            connection_status = "none"
            connection = FriendConnection.get_friendship(current_user, user)
            if connection:
                if connection.from_user == current_user:
                    connection_status = f"sent_{connection.status}"
                else:
                    connection_status = f"received_{connection.status}"
            
            result.append({
                'id': user.id,
                'username': user.username,
                'name': user.name,
                'mutual_friends_count': mutual_friends_count,
                'connection_status': connection_status,
            })
        
        return JsonResponse(result, safe=False)


@method_decorator(csrf_exempt, name='dispatch')
class SendConnectionRequestView(LoginRequiredMixin, View):
    def post(self, request):
        
        # send a friend connection request from current user to another user.
        
        current_user = request.user
        data = request.POST
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({'error': 'user_id is required'}, status=400)
        
        # check if target user exists
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        
        # avoid self connections
        if current_user.id == target_user.id:
            return JsonResponse(
                {'error': 'Cannot send friend request to yourself'}, 
                status=400
            )
        
        # check if connection already exists
        existing_connection = FriendConnection.get_friendship(current_user, target_user)
        
        if existing_connection:
            # only block if the status is accepted or pending
            if existing_connection.status in ['accepted', 'pending']:
                if existing_connection.from_user == current_user:
                    return JsonResponse({
                        'error': f'You already sent a connection request to this user (status: {existing_connection.status})'
                    }, status=400)
                else:
                    return JsonResponse({
                        'error': f'This user already sent you a connection request (status: {existing_connection.status})'
                    }, status=400)
            # if status is rejected, allow sending a new request
            elif existing_connection.status == 'rejected':
                connection = FriendConnection(
                    from_user=current_user,
                    to_user=target_user,
                    status="pending"
                )
                connection.save()
                
                return JsonResponse({
                    'status': 'success',
                    'message': f'Friend request sent to {target_user.username}',
                    'connection_id': existing_connection.id
                }, status=201)
        
        # create new connection request (no existing connection)
        connection = FriendConnection.objects.create(
            from_user=current_user,
            to_user=target_user,
            status="pending"
        )
        
        return JsonResponse({
            'status': 'success',
            'message': f'Friend request sent to {target_user.username}',
            'connection_id': connection.id
        }, status=201)


class UserConnectionsView(LoginRequiredMixin, View):
    def get(self, request):

        # get all pending sent, pending received, and accepted connections for the current user
    
        user = request.user
        
        # get connections where user is either the requester or recipient
        connections = FriendConnection.objects.filter(
            Q(from_user=user) | Q(to_user=user)
        ).select_related('from_user', 'to_user')
        
        result = {
            'friends': [],
            'pending_sent': [],
            'pending_received': []
        }
        
        for conn in connections:
            if conn.from_user == user:
                other_user = conn.to_user
                is_requester = True
            else:
                other_user = conn.from_user
                is_requester = False
                
            user_data = {
                'id': other_user.id,
                'username': other_user.username,
                'name': other_user.name,
            }
            
            # categorize based on status and direction
            if conn.status == 'accepted':
                result['friends'].append(user_data)
            elif conn.status == 'pending':
                if is_requester:
                    result['pending_sent'].append(user_data)
                else:
                    result['pending_received'].append(user_data)
                    
        return JsonResponse(result, safe=False)


@method_decorator(csrf_exempt, name='dispatch')
class HandleConnectionRequestView(LoginRequiredMixin, View):
    def post(self, request):
        
        # accept or reject a connection request
        
        user = request.user
        data = request.POST
        user_id = data.get('user_id')
        action = data.get('action')  # ('accept' or 'reject')
        
        if not user_id or not action:
            return JsonResponse({'error': 'user_id and action are required'}, status=400)
            
        if action not in ['accept', 'reject']:
            return JsonResponse({'error': "action must be either 'accept' or 'reject'"}, status=400)
            
        # find the pending request to the current user
        try:
            connection = FriendConnection.objects.get(
                from_user_id=user_id,
                to_user=user,
                status='pending'
            )
        except FriendConnection.DoesNotExist:
            return JsonResponse({'error': 'No pending request found from this user to you'}, status=404)
            
        if action == 'accept':
            connection.status = 'accepted'
            connection.save()
            return JsonResponse({'status': 'success', 'message': 'Friend request accepted'})
        else:
            connection.status = 'rejected'
            connection.save()
            return JsonResponse({'status': 'success', 'message': 'Friend request rejected'})
        

class FriendsSubscriptionsView(LoginRequiredMixin, View):
    def get(self, request):
       
        # get all shareable subscriptions of friends

        user = request.user
        
        friend_ids = FriendConnection.get_friend_ids(user)
        
        friends = User.objects.filter(id__in=friend_ids)
        
        subscriptions_list = []
        
        for friend in friends:
            subscriptions = friend.subscriptions.filter(is_shareable=True)
            
            for sub in subscriptions:
                subscription_data = {
                    'id': sub.id,
                    'service_name': sub.service_name,
                    'renew_date': sub.renew_date.isoformat() if sub.renew_date else None,
                    'logo': f"https://logo.clearbit.com/{sub.service_name.split()[0].lower()}.com",
                    'friend': {
                        'id': friend.id,
                        'username': friend.username,
                        'name': friend.name
                    }
                }
                subscriptions_list.append(subscription_data)
        
        return JsonResponse(subscriptions_list, safe=False)


@method_decorator(csrf_exempt, name='dispatch')
class RemoveFriendView(LoginRequiredMixin, View):
    def post(self, request):
        user = request.user
        data = request.POST
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({'error': 'user_id is required'}, status=400)
            
        try:
            connection = FriendConnection.objects.get(
                (Q(from_user=user, to_user_id=user_id) | 
                Q(from_user_id=user_id, to_user=user)),
                status='accepted'
            )
            connection.delete()
            return JsonResponse({'status': 'success', 'message': 'Friend removed successfully'})
        except FriendConnection.DoesNotExist:
            return JsonResponse({'error': 'No friendship found with this user'}, status=404)