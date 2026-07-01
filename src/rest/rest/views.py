from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import os
from pymongo import MongoClient

mongo_uri = 'mongodb://' + os.environ["MONGO_HOST"] + ':' + os.environ["MONGO_PORT"]
db = MongoClient(mongo_uri)['test_db']

TODOS_COLLECTION = 'todos'


def serialize_todo(document):
    return {
        'id': str(document['_id']),
        'description': document['description'],
    }


class TodoListView(APIView):

    def get(self, request):
        todos = db[TODOS_COLLECTION].find()
        return Response(
            [serialize_todo(todo) for todo in todos],
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        description = request.data.get('description', '').strip()

        if not description:
            return Response(
                {'error': 'Description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = db[TODOS_COLLECTION].insert_one({'description': description})
        created_todo = db[TODOS_COLLECTION].find_one({'_id': result.inserted_id})

        return Response(
            serialize_todo(created_todo),
            status=status.HTTP_201_CREATED,
        )
