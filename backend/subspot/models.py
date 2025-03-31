from django.db import models
from django.contrib.auth.models import AbstractUser
from dateutil.relativedelta import relativedelta
from django.db.models import Q, Case, When, IntegerField

class User(AbstractUser):
    name = models.CharField(max_length=100,blank=True)
    phone_no = models.CharField(max_length=15,blank=True)

    def  __str__(self):
        return str(self.id) + self.name   

class Subscription(models.Model):
    class BillingCycle(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        YEARLY = 'yearly', 'Yearly'

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="subscriptions")
    service_name = models.CharField(max_length=255)
    billing_cycle = models.CharField(max_length=50, choices=BillingCycle.choices, default=BillingCycle.MONTHLY) 
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    renew_date = models.DateField(blank=True, null=True)
    is_shareable = models.BooleanField(default=True)
    is_autorenew = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.renew_date:
            self.renew_date = self.calculate_renew_date()
        super().save(*args, **kwargs)

    def calculate_renew_date(self):
        if self.billing_cycle == self.BillingCycle.MONTHLY:
            return self.start_date + relativedelta(months=1)
        elif self.billing_cycle == self.BillingCycle.QUARTERLY:
            return self.start_date + relativedelta(months=3)
        elif self.billing_cycle == self.BillingCycle.YEARLY:
            return self.start_date + relativedelta(years=1)
        else:
            return self.start_date + relativedelta(months=1)


    def __str__(self):
        return f"{self.id} {self.service_name} ({self.owner.username})"

class Listing(models.Model):
    subscription = models.OneToOneField(Subscription, on_delete=models.CASCADE, related_name="listings")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_sold = models.BooleanField(default=False)
    duration = models.CharField(max_length=255, default="", blank=True)

    def __str__(self):
        return f"{self.id} - Listing for {self.subscription.service_name} - {'Sold' if self.is_sold else 'Available'}"


# direction of friendship is not important - can be initiated by either user
class FriendConnection(models.Model):
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_friendship")
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="initiated_friendship")
    status = models.CharField(max_length=50, choices=[("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected")], default="pending")

    class Meta:
        unique_together = ('to_user', 'from_user') 

    def save(self, *args, **kwargs):
        if not self.pk:
            existing = FriendConnection.objects.filter(
                (Q(from_user=self.from_user) & Q(to_user=self.to_user)) |
                (Q(from_user=self.to_user) & Q(to_user=self.from_user))
            ).first()
            
            if existing and existing.pk != self.pk:
                # if the request was initially rejected but now the other user is initiating
                if existing.status == "rejected" and existing.from_user == self.to_user and existing.to_user == self.from_user:
                    # update both the direction and status
                    existing.from_user = self.from_user
                    existing.to_user = self.to_user
                    existing.status = self.status
                    super(FriendConnection, existing).save(*args, **kwargs)
                    return
                elif self.status != existing.status:
                    existing.status = self.status
                    super(FriendConnection, existing).save(*args, **kwargs)
                    return
                return
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} {self.from_user.username} - {self.to_user.username} ({self.status})"
    
    @classmethod
    def get_friendship(cls, user1, user2):
        return cls.objects.filter(
            (Q(from_user=user1, to_user=user2) | Q(from_user=user2, to_user=user1))
        ).first()
    
    @classmethod
    def are_friends(cls, user1, user2):
        return cls.objects.filter(
            (Q(from_user=user1, to_user=user2) | Q(from_user=user2, to_user=user1)),
            status="accepted"
        ).exists()
    
    @classmethod
    def get_friend_ids(cls, user):
        return cls.objects.filter(
            (Q(from_user=user) | Q(to_user=user)),
            status="accepted"
        ).annotate(
            friend_id=Case(
                When(from_user=user, then='to_user_id'),
                When(to_user=user, then='from_user_id'),
                output_field=IntegerField()
            )
        ).values_list('friend_id', flat=True)
    

class MonthlyExpense(models.Model):
    class Month(models.TextChoices):
        JANUARY = 'January', 'January'
        FEBRUARY = 'February', 'February'
        MARCH = 'March', 'March'
        APRIL = 'April', 'April'
        MAY = 'May', 'May'
        JUNE = 'June', 'June'
        JULY = 'July', 'July'
        AUGUST = 'August', 'August'
        SEPTEMBER = 'September', 'September'
        OCTOBER = 'October', 'October'
        NOVEMBER = 'November', 'November'
        DECEMBER = 'December', 'December'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="monthly_expenses")
    month_name = models.CharField(max_length=20, choices=Month.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('user', 'month_name')

    def __str__(self):
        return f"{self.id} {self.user.username} - {self.month_name}: ${self.amount}"


class Chat(models.Model):
    participants = models.ManyToManyField(User, related_name='chats')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Add this field
    name = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return f"Chat {self.id} - {self.name or 'Unnamed'}"

    def get_other_participant(self, user):
        """Get the other participant in a two-person chat"""
        return self.participants.exclude(id=user.id).first()
    
    @classmethod
    def get_or_create_chat(cls, user1, user2):
        """Get existing chat between two users or create a new one"""
        # Look for an existing chat with both users as participants
        chats = cls.objects.filter(participants=user1).filter(participants=user2)
        
        if chats.exists():
            return chats.first()
        
        # Create a new chat and add participants
        chat = cls.objects.create()
        chat.participants.add(user1, user2)
        return chat
    
    class Meta:
        ordering = ['-created_at']

class Message(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
    ]
    
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField()
    file = models.FileField(upload_to='chat_files/', blank=True, null=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_read = models.BooleanField(default=False)  # Add this field
    
    def __str__(self):
        return f"Message {self.id} from {self.sender.username} in Chat {self.chat.id}"
    
    class Meta:
        ordering = ['created_at']