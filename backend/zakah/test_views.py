from django.http import JsonResponse

def test_zakah_references(request):
    """Simple test function for zakah references"""
    return JsonResponse({"message": "test_zakah_references working", "items": []})
