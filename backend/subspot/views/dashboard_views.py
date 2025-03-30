from django.http import HttpResponse, JsonResponse
from django.views import View
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

from ..models import Subscription, MonthlyExpense, User

def home(request):
    return HttpResponse("Welcome to the Homepage!")

# class DashboardView(LoginRequiredMixin, View):
#     def get(self, request):
#         # You can render a template instead of returning plain text.
#         return HttpResponse("This is the Dashboard page.")

# views for dashboard page

@method_decorator(csrf_exempt, name='dispatch')
class SubscriptionsView(View):
    def get(self, request):
        # get all subscriptions for the authenticated user

        user = request.user
        subscriptions = list(Subscription.objects.filter(owner=user.id).values())
        
        for sub in subscriptions:
            sub['amount'] = float(sub['amount'])
            # add default logo for now
            sub['logo'] = f"https://logo.clearbit.com/{sub['service_name'].split()[0].lower()}.com"
            # renaming to match frontend
            sub['name'] = sub.pop('service_name')
            sub['cost'] = str(sub.pop('amount'))
            
        return JsonResponse(subscriptions, safe=False)
    
    def post(self, request):
        # create a new subscription

        try:
            data = json.loads(request.body)
            billing_cycle = data.get('reminder', Subscription.BillingCycle.MONTHLY)
            if billing_cycle not in dict(Subscription.BillingCycle.choices):
                billing_cycle = Subscription.BillingCycle.MONTHLY

            new_subscription = Subscription(
                owner=request.user,
                service_name=data.get('name'),
                billing_cycle=billing_cycle,
                amount=data.get('cost'),
                start_date=timezone.now().date(),
                is_shareable=data.get('is_shareable', True),
                is_autorenew=data.get('is_autorenew', False)
            )
            new_subscription.save()
            
            return JsonResponse({
                'id': new_subscription.id,
                'name': new_subscription.service_name,
                'cost': str(new_subscription.amount),
                'logo': f"https://logo.clearbit.com/{new_subscription.service_name.split()[0].lower()}.com",
                'renew_date': new_subscription.renew_date.strftime('%b %d')
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    def delete(self, request, subscription_id):
        # delete a subscription
        try:
            subscription = Subscription.objects.get(id=subscription_id, owner=request.user)
            subscription.delete()
            return JsonResponse({'success': True}, status=200)
        except Subscription.DoesNotExist:
            return JsonResponse({'error': 'Subscription not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class UserExpensesView(View):
    def get(self, request):
        # get expenses data accordig to range

        range1 = request.GET.get('range', 'past_year')

        user = request.user
        today = timezone.now().date()
        current_month = today.month
        current_year = today.year
        
        if range1 == 'last_month':
            months = 1
        elif range1 == 'last_6_months':
            months = 6
        else:
            months = 12


        expenses_data = []
        months_list = []
        bar_heights = []
        
        for i in range(months):
            month_date = today - relativedelta(months=months-i-1)
            month_name = month_date.strftime('%B')
            months_list.append(month_name)
            
            # check if already calculated
            month_expense = MonthlyExpense.objects.filter(
                user=user, 
                month_name=month_name
            ).first()
            
            if month_expense:
                amount = float(month_expense.amount)
            else:
                # get all active subscriptions for the month
                active_subs = Subscription.objects.filter(
                    owner=user,
                    start_date__month=month_date.month,
                    start_date__year=month_date.year,
                ) | Subscription.objects.filter(
                    owner=user,
                    renew_date__month=month_date.month,
                    renew_date__year=month_date.year,
                )
                
                # add all subscription amounts
                amount = sum(float(sub.amount) for sub in active_subs)
                
                # save for future use if month finished
                if month_date.month != current_month or month_date.year != current_year:
                    MonthlyExpense.objects.create(
                        user=user,
                        month_name=month_name,
                        amount=amount
                    )
            
            bar_heights.append(amount)
            
            expenses_data.append({
                'month': month_name,
                'amount': amount
            })
        
        return JsonResponse({
            'expenses': expenses_data,
            'months': months_list,
            'barHeights': bar_heights,
        })

@method_decorator(csrf_exempt, name='dispatch')
class SubscriptionRemindersView(View):
    def get(self, request):
        # get subscriptions that need reminders

        user = request.user
        today = timezone.now().date()
        
        # reminder only if not autorenewable
        reminders = Subscription.objects.filter(
            owner=user,
            is_autorenew=False,
            renew_date__lte = today + relativedelta(days=4)
        ).values('id', 'service_name', 'renew_date', 'amount')

        for reminder in reminders:
            reminder['end_date'] = reminder.pop('renew_date').strftime('%b %d')
            reminder['cost'] = str(reminder.pop('amount'))
            reminder['logo'] = f"https://logo.clearbit.com/{reminder['service_name'].split()[0].lower()}.com"
            reminder['name'] = reminder.pop('service_name')

        return JsonResponse(list(reminders), safe=False)
        
        
@method_decorator(csrf_exempt, name='dispatch')
class MarkReminderDoneView(View):
    def post(self, request):
        # mark a reminder as done (update renew date)

        try:
            data = request.POST
            subscription_id = data.get('subscription_id')
            
            try:
                subscription = Subscription.objects.get(id=subscription_id, owner=request.user)
            except Subscription.DoesNotExist:
                return JsonResponse({'error': 'Subscription not found'}, status=404)
            
            # new renewal date = current renewal date + billing cycle
            if subscription.billing_cycle == Subscription.BillingCycle.MONTHLY:
                subscription.renew_date += relativedelta(months=1)
            elif subscription.billing_cycle == Subscription.BillingCycle.QUARTERLY:
                subscription.renew_date += relativedelta(months=3)
            elif subscription.billing_cycle == Subscription.BillingCycle.YEARLY:
                subscription.renew_date += relativedelta(years=1)
            else:
                subscription.renew_date += relativedelta(months=1)
            

            subscription.save()
            
            return JsonResponse({
                'success': True,
                'id': subscription.id,
                'name': subscription.service_name,
                'next_renew_date': subscription.renew_date.strftime('%b %d, %Y')
            }, status=200)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)